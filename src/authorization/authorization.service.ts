import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  AccessOperation,
  accessOperations,
} from "./dto/authorize-access.dto";

export type AccessDecision = "ALLOW" | "DENY";

export interface AuthorizationResult {
  decision: AccessDecision;
  reasonCode: string;
  message: string;
  researchRequestId: string;
  datasetId: string | null;
  operation: AccessOperation;
  evaluatedAt: Date;
  eligibleParticipantCount?: number;
}

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async evaluate(
    researcherId: string | undefined,
    researchRequestId: string,
    operation: AccessOperation,
  ): Promise<AuthorizationResult> {
    const evaluatedAt = new Date();
    const deny = async (
      reasonCode: string,
      message: string,
      datasetId: string | null = null,
    ): Promise<AuthorizationResult> => {
      await this.audit.record({
        actorId: researcherId,
        eventType: "ACCESS_AUTHORIZATION_DENIED",
        outcome: "DENIED",
        reasonCode,
        researchRequestId,
        datasetId: datasetId ?? undefined,
        operation,
      });
      return {
        decision: "DENY",
        reasonCode,
        message,
        researchRequestId,
        datasetId,
        operation,
        evaluatedAt,
      };
    };

    if (!researcherId) {
      return await deny("UNAUTHENTICATED", "Authentication is required");
    }

    if (!accessOperations.includes(operation)) {
      return await deny("INVALID_OPERATION", "The requested operation is unsupported");
    }

    const request = await this.prisma.researchRequest.findUnique({
      where: { id: researchRequestId },
      select: {
        id: true,
        researcherId: true,
        datasetId: true,
        purpose: true,
        status: true,
        requestedConsentOperations: true,
        benefitAgreements: {
          where: { status: "ACCEPTED", acceptedAt: { not: null } },
          orderBy: { version: "desc" },
          take: 1,
          select: { acceptedAt: true, status: true },
        },
      },
    });

    if (!request) {
      return await deny("REQUEST_NOT_FOUND", "Research request not found");
    }
    if (request.researcherId !== researcherId) {
      return await deny("REQUEST_NOT_OWNED", "Research request is not owned by the caller", request.datasetId);
    }
    if (!request.requestedConsentOperations.includes(operation)) {
      return await deny("OPERATION_NOT_REQUESTED", "Operation was not requested", request.datasetId);
    }
    if (request.status !== "APPROVED") {
      return await deny("REQUEST_NOT_APPROVED", "Research request is not approved", request.datasetId);
    }
    if (
      request.benefitAgreements.length === 0
    ) {
      return await deny(
        "BENEFIT_AGREEMENT_NOT_ACCEPTED",
        "Add a benefit agreement for this research request and have it accepted by the community governance member before accessing the dataset",
        request.datasetId,
      );
    }

    const dataset = await this.prisma.dataset.findUnique({
      where: { id: request.datasetId },
      select: { id: true, communityId: true },
    });
    if (!dataset) {
      return await deny("DATASET_MISMATCH", "Requested dataset was not found", request.datasetId);
    }

    const decision = await this.prisma.governanceDecision.findUnique({
      where: { researchRequestId: request.id },
      select: {
        outcome: true,
        communityId: true,
        approvedOperations: true,
      },
    });
    if (!decision || decision.outcome !== "APPROVED") {
      return await deny("GOVERNANCE_APPROVAL_MISSING", "Governance approval is missing", dataset.id);
    }
    if (decision.communityId !== dataset.communityId) {
      return await deny("CONSENT_STATE_INVALID", "Governance and dataset communities differ", dataset.id);
    }
    if (!decision.approvedOperations.includes(operation)) {
      return await deny(
        "OPERATION_NOT_GOVERNANCE_APPROVED",
        "Operation was not approved by governance",
        dataset.id,
      );
    }

    const participants = await this.prisma.participant.findMany({
      where: { datasetId: dataset.id, communityId: dataset.communityId },
      select: { id: true },
    });
    if (participants.length === 0) {
      return await deny("PARTICIPANT_CONSENT_MISSING", "No eligible participant consent exists", dataset.id);
    }

    const consents = await this.prisma.consent.findMany({
      where: {
        datasetId: dataset.id,
        participantId: { in: participants.map((participant) => participant.id) },
      },
      orderBy: [{ participantId: "asc" }, { version: "desc" }],
      select: {
        participantId: true,
        purpose: true,
        version: true,
        status: true,
        expiresAt: true,
        permissions: {
          where: { operation },
          select: { operation: true, allowed: true },
        },
      },
    });

    let eligibleParticipantCount = 0;
    let aggregateFailure:
      | { reasonCode: string; message: string }
      | undefined;
    for (const participant of participants) {
      const participantConsents = consents.filter(
        (consent) => consent.participantId === participant.id,
      );
      const latest = participantConsents[0];
      if (!latest) {
        if (operation === "ACADEMIC_AGGREGATE_RESEARCH") {
          aggregateFailure ??= {
            reasonCode: "PARTICIPANT_CONSENT_MISSING",
            message: "Participant consent is missing",
          };
          continue;
        }
        return await deny("PARTICIPANT_CONSENT_MISSING", "Participant consent is missing", dataset.id);
      }
      if (
        participantConsents.length > 1 &&
        participantConsents[1].version === latest.version
      ) {
        if (operation === "ACADEMIC_AGGREGATE_RESEARCH") {
          aggregateFailure ??= {
            reasonCode: "CONSENT_STATE_INVALID",
            message: "Participant consent is inconsistent",
          };
          continue;
        }
        return await deny("CONSENT_STATE_INVALID", "Participant consent is inconsistent", dataset.id);
      }
      if (latest.status === "WITHDRAWN") {
        if (operation === "ACADEMIC_AGGREGATE_RESEARCH") {
          aggregateFailure ??= {
            reasonCode: "PARTICIPANT_CONSENT_WITHDRAWN",
            message: "Participant consent was withdrawn",
          };
          continue;
        }
        return await deny("PARTICIPANT_CONSENT_WITHDRAWN", "Participant consent was withdrawn", dataset.id);
      }
      if (
        latest.status !== "ACTIVE" ||
        latest.purpose !== request.purpose ||
        (latest.expiresAt !== null && latest.expiresAt <= evaluatedAt)
      ) {
        if (operation === "ACADEMIC_AGGREGATE_RESEARCH") {
          aggregateFailure ??= {
            reasonCode: "CONSENT_STATE_INVALID",
            message: "Participant consent is not currently valid",
          };
          continue;
        }
        return await deny("CONSENT_STATE_INVALID", "Participant consent is not currently valid", dataset.id);
      }
      if (latest.permissions.length !== 1 || !latest.permissions[0].allowed) {
        if (operation === "ACADEMIC_AGGREGATE_RESEARCH") {
          aggregateFailure ??= {
            reasonCode: "PARTICIPANT_CONSENT_DENIED",
            message: "Participant consent does not permit the operation",
          };
          continue;
        }
        return await deny("PARTICIPANT_CONSENT_DENIED", "Participant consent does not permit the operation", dataset.id);
      }
      eligibleParticipantCount += 1;
    }

    if (
      operation === "ACADEMIC_AGGREGATE_RESEARCH" &&
      eligibleParticipantCount === 0
    ) {
      return await deny(
        aggregateFailure?.reasonCode ?? "PARTICIPANT_CONSENT_MISSING",
        aggregateFailure?.message ?? "No participant currently permits the operation",
        dataset.id,
      );
    }

    const result: AuthorizationResult = {
      decision: "ALLOW",
      reasonCode: "AUTHORIZED",
      message: "The requested operation is authorized",
      researchRequestId,
      datasetId: dataset.id,
      operation,
      evaluatedAt,
      ...(operation === "ACADEMIC_AGGREGATE_RESEARCH"
        ? { eligibleParticipantCount }
        : {}),
    };
    await this.audit.record({
      actorId: researcherId,
      eventType: "ACCESS_AUTHORIZATION_ALLOWED",
      outcome: "ALLOWED",
      reasonCode: result.reasonCode,
      researchRequestId,
      datasetId: dataset.id,
      operation,
    });
    return result;
  }

  async execute(
    researcherId: string | undefined,
    researchRequestId: string,
    operation: AccessOperation,
  ) {
    const authorization = await this.evaluate(
      researcherId,
      researchRequestId,
      operation,
    );

    if (authorization.decision === "DENY") {
      await this.audit.record({
        actorId: researcherId,
        eventType: "DATA_ACCESS_EXECUTION_DENIED",
        outcome: "DENIED",
        reasonCode: authorization.reasonCode,
        researchRequestId,
        datasetId: authorization.datasetId ?? undefined,
        operation,
      });
      return authorization;
    }

    if (operation !== "ACADEMIC_AGGREGATE_RESEARCH") {
      const denied = {
        ...authorization,
        decision: "DENY" as const,
        reasonCode: "OPERATION_NOT_EXECUTABLE",
        message: "Only synthetic aggregate research is executable",
      };
      await this.audit.record({
        actorId: researcherId,
        eventType: "DATA_ACCESS_EXECUTION_DENIED",
        outcome: "DENIED",
        reasonCode: denied.reasonCode,
        researchRequestId,
        datasetId: authorization.datasetId ?? undefined,
        operation,
      });
      return denied;
    }

    const request = await this.prisma.researchRequest.findUnique({
      where: { id: researchRequestId },
      select: { purpose: true },
    });
    const eligibleParticipantIds = request
      ? await this.findEligibleParticipantIds(
          authorization.datasetId!,
          request.purpose,
        )
      : [];
    const observations = await this.prisma.syntheticObservation.findMany({
      where: {
        datasetId: authorization.datasetId!,
        participantId: { in: eligibleParticipantIds },
      },
      select: {
        wellbeingScore: true,
        sleepQualityScore: true,
        stressLevelScore: true,
      },
    });
    if (observations.length === 0) {
      const denied = {
        ...authorization,
        decision: "DENY" as const,
        reasonCode: "SYNTHETIC_DATA_UNAVAILABLE",
        message: "No synthetic aggregate data is available for eligible participants",
      };
      await this.audit.record({
        actorId: researcherId,
        eventType: "DATA_ACCESS_EXECUTION_DENIED",
        outcome: "DENIED",
        reasonCode: denied.reasonCode,
        researchRequestId,
        datasetId: authorization.datasetId ?? undefined,
        operation,
      });
      return denied;
    }
    const average = (values: number[]) =>
      Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
    const participantCount = observations.length;

    const executed = {
      ...authorization,
      result: {
        type: "SYNTHETIC_AGGREGATE",
        datasetId: authorization.datasetId,
        participantCount,
        metrics: {
          averageWellbeingScore: average(observations.map((row) => row.wellbeingScore)),
          averageSleepQualityScore: average(observations.map((row) => row.sleepQualityScore)),
          averageStressLevelScore: average(observations.map((row) => row.stressLevelScore)),
        },
      },
    };
    await this.audit.record({
      actorId: researcherId,
      eventType: "DATA_ACCESS_EXECUTED",
      outcome: "SUCCESS",
      researchRequestId,
      datasetId: authorization.datasetId ?? undefined,
      operation,
    });
    return executed;
  }

  private async findEligibleParticipantIds(
    datasetId: string,
    purpose: string,
  ): Promise<string[]> {
    const participants = await this.prisma.participant.findMany({
      where: { datasetId },
      select: { id: true },
    });
    if (participants.length === 0) return [];

    const consents = await this.prisma.consent.findMany({
      where: {
        datasetId,
        participantId: { in: participants.map((participant) => participant.id) },
      },
      orderBy: [{ participantId: "asc" }, { version: "desc" }],
      select: {
        participantId: true,
        purpose: true,
        version: true,
        status: true,
        expiresAt: true,
        permissions: {
          where: { operation: "ACADEMIC_AGGREGATE_RESEARCH" },
          select: { allowed: true },
        },
      },
    });
    const now = new Date();
    return participants
      .filter((participant) => {
        const participantConsents = consents.filter(
          (consent) => consent.participantId === participant.id,
        );
        const latest = participantConsents[0];
        return Boolean(
          latest &&
            !(participantConsents[1]?.version === latest.version) &&
            latest.status === "ACTIVE" &&
            latest.purpose === purpose &&
            (!latest.expiresAt || latest.expiresAt > now) &&
            latest.permissions.length === 1 &&
            latest.permissions[0].allowed,
        );
      })
      .map((participant) => participant.id);
  }
}
