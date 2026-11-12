import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { GovernanceService } from "./governance.service";
import { GovernanceDecisionDto } from "./dto/governance-decision.dto";
import { AuditService } from "../audit/audit.service";

describe("GovernanceService", () => {
  let service: GovernanceService;
  const transaction = {
    researchRequest: { updateMany: jest.fn() },
    governanceDecision: { create: jest.fn() },
    dataset: { findUnique: jest.fn() },
  };
  const prisma = {
    researchRequest: { findUnique: jest.fn(), findMany: jest.fn() },
    governanceDecision: { findUnique: jest.fn() },
    dataset: { findUnique: jest.fn() },
    communityMembership: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceService,
        PrismaService,
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    service = module.get(GovernanceService);
    prisma.researchRequest.findUnique.mockResolvedValue({
      id: "request-1",
      researcherId: "researcher-1",
      datasetId: "dataset-1",
      status: "PENDING",
      requestedConsentOperations: [
        "ACADEMIC_AGGREGATE_RESEARCH",
        "IDENTIFIABLE_RECORD_ACCESS",
        "COMMERCIAL_AI_TRAINING",
      ],
      dataset: { communityId: "community-1" },
      benefitAgreement: {
        acceptedById: "governance-1",
        acceptedAt: new Date(),
        status: "COMMITTED",
      },
    });
    prisma.communityMembership.findUnique.mockResolvedValue({
      role: "GOVERNANCE_MEMBER",
    });
    transaction.researchRequest.updateMany.mockResolvedValue({ count: 1 });
    transaction.dataset.findUnique.mockResolvedValue({
      communityId: "community-1",
    });
    transaction.governanceDecision.create.mockResolvedValue({
      id: "decision-1",
    });
  });

  const approval: GovernanceDecisionDto = {
    reason: "Aggregate analysis is the limited approved purpose.",
    approvedOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
  };

  it("approves only operations included in the request", async () => {
    await service.decide("request-1", "governance-1", "APPROVED", approval);

    expect(transaction.governanceDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          outcome: "APPROVED",
          approvedOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
        }),
      }),
    );
  });

  it("rejects an operation outside the request", async () => {
    prisma.researchRequest.findUnique.mockResolvedValueOnce({
      id: "request-1",
      researcherId: "researcher-1",
      datasetId: "dataset-1",
      status: "PENDING",
      requestedConsentOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
      dataset: { communityId: "community-1" },
      benefitAgreement: {
        acceptedById: "governance-1",
        acceptedAt: new Date(),
        status: "COMMITTED",
      },
    });
    await expect(
      service.decide("request-1", "governance-1", "APPROVED", {
        ...approval,
        approvedOperations: ["COMMERCIAL_AI_TRAINING", "IDENTIFIABLE_RECORD_ACCESS"],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects empty approvals and self-decisions", async () => {
    await expect(
      service.decide("request-1", "governance-1", "APPROVED", {
        ...approval,
        approvedOperations: [],
      }),
    ).rejects.toThrow("approved operations");

    await expect(
      service.decide("request-1", "researcher-1", "REJECTED", approval),
    ).rejects.toThrow("own request");
  });

  it("uses a transaction and blocks duplicate decisions", async () => {
    await service.decide("request-1", "governance-1", "REJECTED", approval);
    expect(transaction.researchRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "request-1", status: "PENDING" },
        data: { status: "REJECTED" },
      }),
    );

    transaction.researchRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.decide("request-1", "governance-2", "APPROVED", approval),
    ).rejects.toThrow("no longer pending");
  });

  it("allows research approval before a benefit agreement exists", async () => {
    prisma.researchRequest.findUnique.mockResolvedValueOnce({
      id: "request-1",
      researcherId: "researcher-1",
      datasetId: "dataset-1",
      status: "PENDING",
      requestedConsentOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
      dataset: { communityId: "community-1" },
    });

    await expect(
      service.decide("request-1", "governance-1", "APPROVED", approval),
    ).resolves.toBeDefined();
  });
});
