import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateBenefitAgreementDto } from "./dto/create-benefit-agreement.dto";
import { UpdateBenefitAgreementDto } from "./dto/update-benefit-agreement.dto";
import { RejectBenefitAgreementDto } from "./dto/reject-benefit-agreement.dto";
import { version } from "os";

@Injectable()
export class BenefitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(researcherId: string, dto: CreateBenefitAgreementDto) {
    const request = await this.prisma.researchRequest.findUnique({
      where: { id: dto.researchRequestId },
      select: {
        id: true,
        researcherId: true,
        datasetId: true,
        status: true,
        decisions: { select: { outcome: true } },
        dataset: { select: { communityId: true } },
      },
    });

    if (!request) {
      throw new NotFoundException("Research request not found");
    }
    if (request.researcherId !== researcherId) {
      throw new ConflictException("Research request is not owned by the caller");
    }
    if (
      request.status !== "APPROVED" ||
      !request.decisions.some((decision) => decision.outcome === "APPROVED")
    ) {
      throw new BadRequestException(
        "Only an approved research request can receive a benefit agreement",
      );
    }

    if (request.dataset.communityId !== dto.communityId) {
      throw new BadRequestException(
        "Beneficiary community does not own the requested dataset",
      );
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const latest = await transaction.benefitAgreement.findFirst({
          where: { researchRequestId: request.id },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        const agreement = await transaction.benefitAgreement.create({
          data: {
            researchRequestId: request.id,
            version: (latest?.version ?? 0) + 1,
            communityId: dto.communityId,
            researcherId,
            description: dto.description.trim(),
          },
          select: this.agreementSelect,
        });
        await this.audit.record(
          {
            actorId: researcherId,
            eventType: "BENEFIT_AGREEMENT_CREATED",
            outcome: "SUCCESS",
            researchRequestId: request.id,
            datasetId: request.datasetId,
          },
          transaction,
        );
        return agreement;
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
          throw new ConflictException(
            "A benefit agreement version could not be created",
        );
      }
      throw error;
    }
  }

  async accept(governanceMemberId: string, id: string) {
    const agreement = await this.prisma.benefitAgreement.findUnique({
      where: { id },
      select: {
        id: true,
        communityId: true,
        researchRequestId: true,
        status: true,
        researchRequest: { select: { status: true, datasetId: true } },
      },
    });

    if (!agreement) {
      throw new NotFoundException("Benefit agreement not found");
    }
    if (agreement.researchRequest.status !== "APPROVED") {
      throw new ConflictException(
        "A benefit agreement can only be reviewed after research approval",
      );
    }
    if (agreement.status !== "PENDING") {
      throw new ConflictException("Only a pending benefit agreement can be accepted");
    }

    const membership = await this.prisma.communityMembership.findUnique({
      where: {
        userId_communityId: {
          userId: governanceMemberId,
          communityId: agreement.communityId,
        },
      },
      select: { role: true },
    });
    if (!membership || membership.role !== "GOVERNANCE_MEMBER") {
      throw new ConflictException(
        "Only a governance member of the beneficiary community can accept the agreement",
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const accepted = await transaction.benefitAgreement.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          acceptedById: governanceMemberId,
          acceptedAt: new Date(),
        },
        select: this.agreementSelect,
      });
      await this.audit.record(
        {
          actorId: governanceMemberId,
          eventType: "BENEFIT_AGREEMENT_UPDATED",
          outcome: "SUCCESS",
          researchRequestId: agreement.researchRequestId,
          datasetId: agreement.researchRequest.datasetId,
          metadata: { accepted: true },
        },
        transaction,
      );
      return accepted;
    });
  }

  async reject(
    governanceMemberId: string,
    id: string,
    dto: RejectBenefitAgreementDto,
  ) {
    const agreement = await this.prisma.benefitAgreement.findUnique({
      where: { id },
      select: {
        id: true,
        communityId: true,
        researchRequestId: true,
        status: true,
        researchRequest: { select: { status: true, datasetId: true } },
      },
    });
    if (!agreement) {
      throw new NotFoundException("Benefit agreement not found");
    }
    if (agreement.researchRequest.status !== "APPROVED") {
      throw new ConflictException(
        "A benefit agreement can only be reviewed after research approval",
      );
    }
    if (agreement.status !== "PENDING") {
      throw new ConflictException("Only a pending benefit agreement can be rejected");
    }
    const membership = await this.prisma.communityMembership.findUnique({
      where: {
        userId_communityId: {
          userId: governanceMemberId,
          communityId: agreement.communityId,
        },
      },
      select: { role: true },
    });
    if (!membership || membership.role !== "GOVERNANCE_MEMBER") {
      throw new ConflictException(
        "Only a governance member of the beneficiary community can reject the agreement",
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      const rejected = await transaction.benefitAgreement.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: dto.reason.trim(),
        },
        select: this.agreementSelect,
      });
      await this.audit.record(
        {
          actorId: governanceMemberId,
          eventType: "BENEFIT_AGREEMENT_UPDATED",
          outcome: "SUCCESS",
          researchRequestId: agreement.researchRequestId,
          datasetId: agreement.researchRequest.datasetId,
          metadata: { status: "REJECTED", rejectionReason: dto.reason.trim() },
        },
        transaction,
      );
      return rejected;
    });
  }

  async findByRequest(
    userId: string,
    roleOrRequestId: string,
    maybeRequestId?: string,
  ) {
    const role = maybeRequestId ? roleOrRequestId : "RESEARCHER";
    const requestId = maybeRequestId ? maybeRequestId : roleOrRequestId;
    const agreement = await this.prisma.benefitAgreement.findFirst({
      where: { researchRequestId: requestId },
      orderBy: { version: "desc" },
      select: {
        ...this.agreementSelect,
        researcher: {
          select: { firstName: true, lastName: true, email: true },
        },
        researchRequest: { select: { researcherId: true } },
      },
    });
    if (
      !agreement ||
      (role !== "GOVERNANCE_MEMBER" && agreement.researchRequest.researcherId !== userId)
    ) {
      throw new NotFoundException("Benefit agreement not found");
    }
    const { researchRequest: _researchRequest, ...result } = agreement;
    return result;
  }

  async findVersionsByRequest(userId: string, role: string, requestId: string) {
    const request = await this.prisma.researchRequest.findUnique({
      where: { id: requestId },
      select: { researcherId: true },
    });
    if (!request || (role !== "GOVERNANCE_MEMBER" && request.researcherId !== userId)) {
      throw new NotFoundException("Research request not found");
    }
    return this.prisma.benefitAgreement.findMany({
      where: { researchRequestId: requestId },
      orderBy: { version: "desc" },
      select: {
        ...this.agreementSelect,
        researcher: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async update(
    researcherId: string,
    id: string,
    dto: UpdateBenefitAgreementDto,
  ) {
    const agreement = await this.prisma.benefitAgreement.findUnique({
      where: { id },
      select: {
        id: true,
        researcherId: true,
        version: true,
        researchRequestId: true,
        status: true,
        acceptedById: true,
        acceptedAt: true,
        rejectionReason: true,
        researchRequest: { select: { datasetId: true } },
      },
    });

    if (!agreement || agreement.researcherId !== researcherId) {
      throw new NotFoundException("Benefit agreement not found");
    }
    if (
      agreement.status === "CANCELLED" &&
      dto.status !== "CANCELLED"
    ) {
      throw new ConflictException(
        "A cancelled benefit agreement cannot be reopened",
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.benefitAgreement.update({
        where: { id },
        data: { status: dto.status },
        select: this.agreementSelect,
      });
      await this.audit.record(
        {
          actorId: researcherId,
          eventType: "BENEFIT_AGREEMENT_UPDATED",
          outcome: "SUCCESS",
          researchRequestId: agreement.researchRequestId,
          datasetId: agreement.researchRequest.datasetId,
          metadata: { status: dto.status },
        },
        transaction,
      );
      return updated;
    });
  }

  private readonly agreementSelect = {
    id: true,
    researchRequestId: true,
    communityId: true,
    researcherId: true,
    description: true,
    commitmentDate: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    version: true,
  rejectionReason: true,
  } as const;
}
