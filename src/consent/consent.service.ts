import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { ConsentOperation } from "../../generated/prisma/enums";
import { CreateConsentDto } from "./dto/create-consent.dto";

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateConsentDto) {
    const participant = await this.getOwnedParticipant(userId);
    const decisions = this.validateDecisions(dto.decisions);

    return this.prisma.$transaction(async (transaction) => {
      const latest = await transaction.consent.findFirst({
        where: {
          participantId: participant.id,
          datasetId: participant.datasetId,
        },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      await transaction.consent.updateMany({
        where: {
          participantId: participant.id,
          datasetId: participant.datasetId,
          status: "ACTIVE",
        },
        data: { status: "SUPERSEDED" },
      });

      return transaction.consent.create({
        data: {
          participantId: participant.id,
          datasetId: participant.datasetId,
          recordedById: userId,
          purpose: dto.purpose,
          version: (latest?.version ?? 0) + 1,
          permissions: {
            create: decisions.map(({ operation, allowed }) => ({
              operation,
              allowed,
              permission: this.permissionFor(operation),
            })),
          },
        },
        select: this.consentSelect,
      });
    });
  }

  async getCurrent(userId: string) {
    const participant = await this.getOwnedParticipant(userId);
    return this.prisma.consent.findFirst({
      where: {
        participantId: participant.id,
        datasetId: participant.datasetId,
        status: "ACTIVE",
      },
      orderBy: { version: "desc" },
      select: this.consentSelect,
    });
  }

  async getHistory(userId: string) {
    const participant = await this.getOwnedParticipant(userId);
    return this.prisma.consent.findMany({
      where: { participantId: participant.id, datasetId: participant.datasetId },
      orderBy: { version: "desc" },
      select: this.consentSelect,
    });
  }

  async withdraw(userId: string) {
    const participant = await this.getOwnedParticipant(userId);
    const latest = await this.prisma.consent.findFirst({
      where: {
        participantId: participant.id,
        datasetId: participant.datasetId,
      },
      orderBy: { version: "desc" },
      select: { id: true, status: true },
    });

    if (!latest) {
      throw new NotFoundException("Consent not found");
    }

    if (latest.status === "WITHDRAWN") {
      return this.prisma.consent.findUnique({
        where: { id: latest.id },
        select: this.consentSelect,
      });
    }

    if (latest.status !== "ACTIVE") {
      throw new NotFoundException("Active consent not found");
    }

    return this.prisma.$transaction(async (transaction) => {
      const withdrawn = await transaction.consent.update({
        where: { id: latest.id },
        data: { status: "WITHDRAWN", withdrawnAt: new Date() },
        select: this.consentSelect,
      });
      await this.audit.record(
        {
          actorId: userId,
          eventType: "CONSENT_WITHDRAWN",
          outcome: "SUCCESS",
          datasetId: participant.datasetId,
        },
        transaction,
      );
      return withdrawn;
    });
  }

  private async getOwnedParticipant(userId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { userId },
      select: { id: true, datasetId: true, communityId: true },
    });

    if (!participant) {
      throw new UnauthorizedException(
        "No participant profile is linked to this account",
      );
    }

    return participant;
  }

  private validateDecisions(
    decisions: Record<ConsentOperation, boolean>,
  ): Array<{ operation: ConsentOperation; allowed: boolean }> {
    const operations: ConsentOperation[] = [
      "ACADEMIC_AGGREGATE_RESEARCH",
      "IDENTIFIABLE_RECORD_ACCESS",
      "COMMERCIAL_AI_TRAINING",
    ];
    const keys = Object.keys(decisions);

    if (
      keys.length !== operations.length ||
      keys.some((key) => !operations.includes(key as ConsentOperation)) ||
      operations.some((operation) => typeof decisions[operation] !== "boolean")
    ) {
      throw new BadRequestException(
        "Decisions must include exactly the supported consent operations",
      );
    }

    return operations.map((operation) => ({
      operation,
      allowed: decisions[operation],
    }));
  }

  private permissionFor(operation: ConsentOperation) {
    switch (operation) {
      case "ACADEMIC_AGGREGATE_RESEARCH":
        return "ACADEMIC_RESEARCH" as const;
      case "IDENTIFIABLE_RECORD_ACCESS":
        return "IDENTIFIABLE_DATA" as const;
      case "COMMERCIAL_AI_TRAINING":
        return "AI_MODEL_TRAINING" as const;
    }
  }

  private readonly consentSelect = {
    id: true,
    participantId: true,
    datasetId: true,
    purpose: true,
    version: true,
    status: true,
    consentedAt: true,
    withdrawnAt: true,
    createdAt: true,
    permissions: {
      select: { operation: true, allowed: true },
    },
  } as const;
}
