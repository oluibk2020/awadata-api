import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { GovernanceDecisionDto } from "./dto/governance-decision.dto";

@Injectable()
export class GovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findPending(decisionMakerId: string) {
    const result = await this.findRequests(decisionMakerId, {
      status: "PENDING",
      page: 1,
      limit: 100,
    });
    return result.items;
  }

  async findRequests(
    decisionMakerId: string,
    filters: {
      search?: string;
      status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";
      from?: Date;
      to?: Date;
      page: number;
      limit: number;
    },
  ) {
    const communityIds = await this.communityIdsFor(decisionMakerId);
    const where = {
      status: filters.status,
      createdAt: { gte: filters.from, lte: filters.to },
      dataset: { communityId: { in: communityIds } },
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" as const } },
              { description: { contains: filters.search, mode: "insensitive" as const } },
              {
                researcher: {
                  OR: [
                    { firstName: { contains: filters.search, mode: "insensitive" as const } },
                    { lastName: { contains: filters.search, mode: "insensitive" as const } },
                    { email: { contains: filters.search, mode: "insensitive" as const } },
                  ],
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.researchRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        select: {
          id: true,
          researcherId: true,
          researcher: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          datasetId: true,
          dataset: { select: { name: true, communityId: true } },
          title: true,
          description: true,
          purpose: true,
          requestedConsentOperations: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          decisions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { outcome: true, reason: true, createdAt: true },
          },
          benefitAgreements: {
            orderBy: { version: "desc" },
            take: 1,
            select: { id: true, version: true, status: true, rejectionReason: true },
          },
        },
      }),
      this.prisma.researchRequest.count({ where }),
    ]);
    return {
      items,
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async findBenefitAgreements(
    decisionMakerId: string,
    filters: {
      search?: string;
      status?: "PENDING" | "ACCEPTED" | "REJECTED" | "COMMITTED" | "FULFILLED" | "CANCELLED";
      from?: Date;
      to?: Date;
      page: number;
      limit: number;
    },
  ) {
    const communityIds = await this.communityIdsFor(decisionMakerId);
    const where = {
      status: filters.status,
      createdAt: { gte: filters.from, lte: filters.to },
      communityId: { in: communityIds },
      ...(filters.search
        ? {
            OR: [
              { description: { contains: filters.search, mode: "insensitive" as const } },
              {
                researchRequest: {
                  title: { contains: filters.search, mode: "insensitive" as const },
                },
              },
              {
                researcher: {
                  OR: [
                    { firstName: { contains: filters.search, mode: "insensitive" as const } },
                    { lastName: { contains: filters.search, mode: "insensitive" as const } },
                    { email: { contains: filters.search, mode: "insensitive" as const } },
                  ],
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.benefitAgreement.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { version: "desc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        select: {
          id: true,
          researchRequestId: true,
          version: true,
          communityId: true,
          researcherId: true,
          researcher: { select: { firstName: true, lastName: true, email: true } },
          researchRequest: {
            select: { title: true, datasetId: true, status: true },
          },
          description: true,
          status: true,
          rejectionReason: true,
          acceptedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.benefitAgreement.count({ where }),
    ]);
    return {
      items,
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  private async communityIdsFor(userId: string) {
    const memberships = await this.prisma.communityMembership.findMany({
      where: { userId, role: "GOVERNANCE_MEMBER" },
      select: { communityId: true },
    });
    return memberships.map((membership) => membership.communityId);
  }

  async getDecision(requestId: string, userId: string, role: string) {
    const request = await this.prisma.researchRequest.findUnique({
      where: { id: requestId },
      select: { researcherId: true },
    });

    if (!request || (role !== "GOVERNANCE_MEMBER" && request.researcherId !== userId)) {
      throw new NotFoundException("Research request not found");
    }

    return this.prisma.governanceDecision.findUnique({
      where: { researchRequestId: requestId },
      select: {
        id: true,
        researchRequestId: true,
        decisionMakerId: true,
        outcome: true,
        reason: true,
        approvedOperations: true,
        createdAt: true,
      },
    });
  }

  async decide(
    requestId: string,
    decisionMakerId: string,
    outcome: "APPROVED" | "REJECTED",
    dto: GovernanceDecisionDto,
  ) {
    const request = await this.prisma.researchRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        researcherId: true,
        datasetId: true,
        status: true,
        requestedConsentOperations: true,
        dataset: { select: { communityId: true } },
      },
    });

    if (!request) {
      throw new NotFoundException("Research request not found");
    }
    if (request.researcherId === decisionMakerId) {
      throw new ConflictException("A researcher cannot decide their own request");
    }
    if (request.status !== "PENDING") {
      throw new ConflictException("Research request is no longer pending");
    }
    const membership = await this.prisma.communityMembership.findUnique({
      where: {
        userId_communityId: {
          userId: decisionMakerId,
          communityId: request.dataset.communityId,
        },
      },
      select: { role: true },
    });
    if (!membership || membership.role !== "GOVERNANCE_MEMBER") {
      throw new ConflictException(
        "Only a governance member of the dataset community can decide",
      );
    }
    if (
      dto.approvedOperations.some(
        (operation) => !request.requestedConsentOperations.includes(operation),
      )
    ) {
      throw new ConflictException(
        "Governance cannot approve an operation that was not requested",
      );
    }
    if (outcome === "APPROVED" && dto.approvedOperations.length === 0) {
      throw new ConflictException("An approval must include approved operations");
    }
    if (dto.reason.trim().length < 10) {
      throw new ConflictException("A meaningful decision reason is required");
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.researchRequest.updateMany({
          where: { id: requestId, status: "PENDING" },
          data: { status: outcome },
        });

        if (updated.count !== 1) {
          throw new ConflictException("Research request is no longer pending");
        }

        const decision = await transaction.governanceDecision.create({
          data: {
            researchRequestId: requestId,
            communityId: await this.datasetCommunityId(transaction, request.datasetId),
            decisionMakerId,
            outcome,
            reason: dto.reason.trim(),
            approvedOperations: outcome === "APPROVED" ? dto.approvedOperations : [],
            policyVersion: 1,
          },
          select: {
            id: true,
            researchRequestId: true,
            decisionMakerId: true,
            outcome: true,
            reason: true,
            approvedOperations: true,
            createdAt: true,
          },
        });
        await this.audit.record(
          {
            actorId: decisionMakerId,
            eventType: "GOVERNANCE_DECISION_RECORDED",
            outcome: "SUCCESS",
            researchRequestId: requestId,
            datasetId: request.datasetId,
            metadata: { outcome },
          },
          transaction,
        );
        return decision;
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictException("A decision already exists for this request");
      }
      throw error;
    }
  }

  private async datasetCommunityId(
    transaction: Pick<PrismaService, "dataset">,
    datasetId: string,
  ) {
    const dataset = await transaction.dataset.findUnique({
      where: { id: datasetId },
      select: { communityId: true },
    });
    if (!dataset) {
      throw new NotFoundException("Dataset not found");
    }
    return dataset.communityId;
  }
}
