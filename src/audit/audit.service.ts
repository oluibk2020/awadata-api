import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditRecord {
  actorId?: string;
  eventType:
    | "RESEARCH_REQUEST_SUBMITTED"
    | "GOVERNANCE_DECISION_RECORDED"
    | "CONSENT_WITHDRAWN"
    | "ACCESS_AUTHORIZATION_ALLOWED"
    | "ACCESS_AUTHORIZATION_DENIED"
    | "DATA_ACCESS_EXECUTED"
    | "DATA_ACCESS_EXECUTION_DENIED"
    | "BENEFIT_AGREEMENT_CREATED"
    | "BENEFIT_AGREEMENT_UPDATED";
  outcome: "ALLOWED" | "DENIED" | "SUCCESS" | "FAILURE";
  reasonCode?: string;
  researchRequestId?: string;
  datasetId?: string;
  operation?:
    | "ACADEMIC_AGGREGATE_RESEARCH"
    | "IDENTIFIABLE_RECORD_ACCESS"
    | "COMMERCIAL_AI_TRAINING";
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(record: AuditRecord, database: Prisma.TransactionClient = this.prisma) {
    return database.auditEvent.create({
      data: {
        actorId: record.actorId,
        eventType: record.eventType,
        outcome: record.outcome,
        reasonCode: record.reasonCode,
        researchRequestId: record.researchRequestId,
        datasetId: record.datasetId,
        operation: record.operation,
        action: this.actionFor(record.eventType),
        resource: record.researchRequestId
          ? "ResearchRequest"
          : record.datasetId
            ? "Dataset"
            : "System",
        resourceId: record.researchRequestId ?? record.datasetId,
        metadata: record.metadata,
      },
    });
  }

  findEvents(filters: {
    researchRequestId?: string;
    datasetId?: string;
    eventType?: AuditRecord["eventType"];
    outcome?: AuditRecord["outcome"];
    page: number;
    limit: number;
  }) {
    const where = {
      researchRequestId: filters.researchRequestId,
      datasetId: filters.datasetId,
      eventType: filters.eventType,
      outcome: filters.outcome,
    };

    return this.prisma.auditEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      select: {
        id: true,
        actorId: true,
        eventType: true,
        outcome: true,
        reasonCode: true,
        researchRequestId: true,
        datasetId: true,
        operation: true,
        occurredAt: true,
      },
    });
  }

  private actionFor(eventType: AuditRecord["eventType"]) {
    switch (eventType) {
      case "RESEARCH_REQUEST_SUBMITTED":
        return "RESEARCH_REQUEST_CREATED" as const;
      case "GOVERNANCE_DECISION_RECORDED":
        return "GOVERNANCE_DECISION_RECORDED" as const;
      case "CONSENT_WITHDRAWN":
        return "CONSENT_WITHDRAWN" as const;
      case "ACCESS_AUTHORIZATION_ALLOWED":
        return "ACCESS_GRANTED" as const;
      case "ACCESS_AUTHORIZATION_DENIED":
        return "ACCESS_DENIED" as const;
      case "DATA_ACCESS_EXECUTED":
        return "DATA_ACCESS_EXECUTED" as const;
      case "DATA_ACCESS_EXECUTION_DENIED":
        return "ACCESS_DENIED" as const;
      case "BENEFIT_AGREEMENT_CREATED":
      case "BENEFIT_AGREEMENT_UPDATED":
        return "BENEFIT_DELIVERY_RECORDED" as const;
    }
  }
}
