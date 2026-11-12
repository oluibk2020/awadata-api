import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateResearchRequestDto } from "./dto/create-research-request.dto";

@Injectable()
export class ResearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(researcherId: string, dto: CreateResearchRequestDto) {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: dto.datasetId },
      select: { id: true, communityId: true },
    });

    if (!dataset) {
      throw new BadRequestException("Dataset not found");
    }

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.researchRequest.create({
        data: {
          researcherId,
          datasetId: dataset.id,
          organisationId: dto.organisationId,
          title: dto.title.trim(),
          description: dto.description.trim(),
          purpose: dto.purpose,
          requestedOperations: [],
          requestedConsentOperations: dto.operations,
        },
        select: this.requestSelect,
      });
      await this.audit.record(
        {
          actorId: researcherId,
          eventType: "RESEARCH_REQUEST_SUBMITTED",
          outcome: "SUCCESS",
          researchRequestId: request.id,
          datasetId: dataset.id,
        },
        transaction,
      );
      return request;
    });
  }

  findMine(researcherId: string) {
    return this.prisma.researchRequest.findMany({
      where: { researcherId },
      orderBy: { createdAt: "desc" },
      select: this.requestSelect,
    });
  }

  async findMineById(researcherId: string, id: string) {
    const request = await this.prisma.researchRequest.findFirst({
      where: { id, researcherId },
      select: this.requestSelect,
    });

    if (!request) {
      throw new NotFoundException("Research request not found");
    }

    return request;
  }

  readonly requestSelect = {
    id: true,
    researcherId: true,
    datasetId: true,
    title: true,
    description: true,
    purpose: true,
    requestedConsentOperations: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    decisions: {
      select: {
        id: true,
        outcome: true,
        reason: true,
        approvedOperations: true,
        createdAt: true,
      },
    },
  } as const;
}
