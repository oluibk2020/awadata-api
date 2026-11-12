import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { AuthorizationService } from "./authorization.service";
import { AuditService } from "../audit/audit.service";

describe("AuthorizationService", () => {
  let service: AuthorizationService;
  const prisma = {
    researchRequest: { findUnique: jest.fn() },
    dataset: { findUnique: jest.fn() },
    governanceDecision: { findUnique: jest.fn() },
    participant: { findMany: jest.fn(), count: jest.fn() },
    consent: { findMany: jest.fn() },
    syntheticObservation: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        PrismaService,
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    service = module.get(AuthorizationService);
  });

  function approvedRequest() {
    prisma.researchRequest.findUnique.mockResolvedValue({
      id: "request-1",
      researcherId: "researcher-1",
      datasetId: "dataset-1",
      purpose: "ACADEMIC",
      status: "APPROVED",
      requestedConsentOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
      benefitAgreements: [{
        acceptedAt: new Date(),
        status: "ACCEPTED",
      }],
    });
    prisma.dataset.findUnique.mockResolvedValue({
      id: "dataset-1",
      communityId: "community-1",
    });
    prisma.governanceDecision.findUnique.mockResolvedValue({
      outcome: "APPROVED",
      communityId: "community-1",
      approvedOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
    });
    prisma.participant.findMany.mockResolvedValue([{ id: "participant-1" }]);
  }

  it("allows approved aggregate access with current consent", async () => {
    approvedRequest();
    prisma.consent.findMany.mockResolvedValue([
      {
        participantId: "participant-1",
        purpose: "ACADEMIC",
        version: 1,
        status: "ACTIVE",
        expiresAt: null,
        permissions: [
          { operation: "ACADEMIC_AGGREGATE_RESEARCH", allowed: true },
        ],
      },
    ]);

    await expect(
      service.evaluate(
        "researcher-1",
        "request-1",
        "ACADEMIC_AGGREGATE_RESEARCH",
      ),
    ).resolves.toMatchObject({ decision: "ALLOW", reasonCode: "AUTHORIZED" });
  });

  it("allows aggregate access from consenting participants when another participant declines", async () => {
    approvedRequest();
    prisma.participant.findMany.mockResolvedValue([
      { id: "participant-1" },
      { id: "participant-2" },
    ]);
    prisma.consent.findMany.mockResolvedValue([
      {
        participantId: "participant-1",
        purpose: "ACADEMIC",
        version: 1,
        status: "ACTIVE",
        expiresAt: null,
        permissions: [
          { operation: "ACADEMIC_AGGREGATE_RESEARCH", allowed: true },
        ],
      },
      {
        participantId: "participant-2",
        purpose: "ACADEMIC",
        version: 1,
        status: "ACTIVE",
        expiresAt: null,
        permissions: [
          { operation: "ACADEMIC_AGGREGATE_RESEARCH", allowed: false },
        ],
      },
    ]);

    await expect(
      service.evaluate(
        "researcher-1",
        "request-1",
        "ACADEMIC_AGGREGATE_RESEARCH",
      ),
    ).resolves.toMatchObject({
      decision: "ALLOW",
      reasonCode: "AUTHORIZED",
      eligibleParticipantCount: 1,
    });
  });

  it.each([
    ["PENDING", "REQUEST_NOT_APPROVED"],
    ["REJECTED", "REQUEST_NOT_APPROVED"],
  ])("denies a %s request", async (status, reasonCode) => {
    approvedRequest();
    prisma.researchRequest.findUnique.mockResolvedValue({
      id: "request-1",
      researcherId: "researcher-1",
      datasetId: "dataset-1",
      purpose: "ACADEMIC",
      status,
      requestedConsentOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
    });

    await expect(
      service.evaluate("researcher-1", "request-1", "ACADEMIC_AGGREGATE_RESEARCH"),
    ).resolves.toMatchObject({ decision: "DENY", reasonCode });
  });

  it("denies missing governance and unapproved operations", async () => {
    approvedRequest();
    prisma.governanceDecision.findUnique.mockResolvedValue(null);
    await expect(
      service.evaluate("researcher-1", "request-1", "ACADEMIC_AGGREGATE_RESEARCH"),
    ).resolves.toMatchObject({
      decision: "DENY",
      reasonCode: "GOVERNANCE_APPROVAL_MISSING",
    });

    approvedRequest();
    prisma.researchRequest.findUnique.mockResolvedValue({
      id: "request-1",
      researcherId: "researcher-1",
      datasetId: "dataset-1",
      purpose: "ACADEMIC",
      status: "APPROVED",
      requestedConsentOperations: ["IDENTIFIABLE_RECORD_ACCESS"],
    });
    await expect(
      service.evaluate("researcher-1", "request-1", "ACADEMIC_AGGREGATE_RESEARCH"),
    ).resolves.toMatchObject({
      decision: "DENY",
      reasonCode: "OPERATION_NOT_REQUESTED",
    });
  });

  it("denies access when the community benefit agreement is missing", async () => {
    approvedRequest();
    prisma.researchRequest.findUnique.mockResolvedValue({
      id: "request-1",
      researcherId: "researcher-1",
      datasetId: "dataset-1",
      purpose: "ACADEMIC",
      status: "APPROVED",
      requestedConsentOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
      benefitAgreements: [],
    });

    await expect(
      service.evaluate(
        "researcher-1",
        "request-1",
        "ACADEMIC_AGGREGATE_RESEARCH",
      ),
    ).resolves.toMatchObject({
      decision: "DENY",
      reasonCode: "BENEFIT_AGREEMENT_NOT_ACCEPTED",
    });
  });

  it.each([
    ["WITHDRAWN", "PARTICIPANT_CONSENT_WITHDRAWN"],
    ["ACTIVE", "PARTICIPANT_CONSENT_DENIED"],
  ])("denies participant consent state %s", async (status, reasonCode) => {
    approvedRequest();
    prisma.consent.findMany.mockResolvedValue([
      {
        participantId: "participant-1",
        purpose: "ACADEMIC",
        version: 2,
        status,
        expiresAt: null,
        permissions: [
          { operation: "ACADEMIC_AGGREGATE_RESEARCH", allowed: status !== "ACTIVE" },
        ],
      },
    ]);

    await expect(
      service.evaluate("researcher-1", "request-1", "ACADEMIC_AGGREGATE_RESEARCH"),
    ).resolves.toMatchObject({ decision: "DENY", reasonCode });
  });

  it("denies another researcher's request and missing consent", async () => {
    approvedRequest();
    await expect(
      service.evaluate("other-researcher", "request-1", "ACADEMIC_AGGREGATE_RESEARCH"),
    ).resolves.toMatchObject({ decision: "DENY", reasonCode: "REQUEST_NOT_OWNED" });

    approvedRequest();
    prisma.consent.findMany.mockResolvedValue([]);
    await expect(
      service.evaluate("researcher-1", "request-1", "ACADEMIC_AGGREGATE_RESEARCH"),
    ).resolves.toMatchObject({
      decision: "DENY",
      reasonCode: "PARTICIPANT_CONSENT_MISSING",
    });
  });

  it("re-evaluates before execution and returns only a synthetic aggregate", async () => {
    approvedRequest();
    prisma.consent.findMany.mockResolvedValue([
      {
        participantId: "participant-1",
        purpose: "ACADEMIC",
        version: 1,
        status: "ACTIVE",
        expiresAt: null,
        permissions: [
          { operation: "ACADEMIC_AGGREGATE_RESEARCH", allowed: true },
        ],
      },
    ]);
    prisma.researchRequest.findUnique
      .mockResolvedValueOnce({
        id: "request-1",
        researcherId: "researcher-1",
        datasetId: "dataset-1",
        purpose: "ACADEMIC",
        status: "APPROVED",
        requestedConsentOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
        benefitAgreements: [{ acceptedAt: new Date(), status: "ACCEPTED" }],
      })
      .mockResolvedValueOnce({ purpose: "ACADEMIC" });
    prisma.syntheticObservation.findMany.mockResolvedValue([
      { wellbeingScore: 72, sleepQualityScore: 68, stressLevelScore: 31 },
    ]);

    const result = await service.execute(
      "researcher-1",
      "request-1",
      "ACADEMIC_AGGREGATE_RESEARCH",
    );

    expect(result).toMatchObject({
      decision: "ALLOW",
      result: {
        type: "SYNTHETIC_AGGREGATE",
        participantCount: 1,
        metrics: {
          averageWellbeingScore: 72,
          averageSleepQualityScore: 68,
          averageStressLevelScore: 31,
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("participant-1");
  });

  it("never executes identifiable or AI-training operations", async () => {
    approvedRequest();
    await expect(
      service.execute("researcher-1", "request-1", "IDENTIFIABLE_RECORD_ACCESS"),
    ).resolves.toMatchObject({ decision: "DENY" });
    expect(prisma.participant.count).not.toHaveBeenCalled();
  });
});
