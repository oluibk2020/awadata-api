import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { BenefitsService } from "./benefits.service";
import { RejectBenefitAgreementDto } from "./dto/reject-benefit-agreement.dto";

describe("BenefitsService", () => {
  let service: BenefitsService;
  const transaction = {
    benefitAgreement: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma = {
    researchRequest: { findUnique: jest.fn() },
    benefitAgreement: { findUnique: jest.fn() },
    communityMembership: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BenefitsService,
        PrismaService,
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    service = module.get(BenefitsService);
  });

  const request = {
    id: "request-1",
    researcherId: "researcher-1",
    datasetId: "dataset-1",
    status: "APPROVED",
    decisions: [{ outcome: "APPROVED" }],
    dataset: { communityId: "community-1" },
  };

  it("creates a pending agreement for an approved request", async () => {
    prisma.researchRequest.findUnique.mockResolvedValue({
      ...request,
      status: "APPROVED",
    });
    transaction.benefitAgreement.findFirst.mockResolvedValue({ version: 1 });
    transaction.benefitAgreement.create.mockResolvedValue({ id: "agreement-1" });

    await service.create("researcher-1", {
      researchRequestId: "request-1",
      communityId: "community-1",
      description: "Share findings and provide a knowledge-sharing session.",
    });

    expect(transaction.benefitAgreement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          researcherId: "researcher-1",
          communityId: "community-1",
        }),
      }),
    );
  });

  it("rejects pending requests and mismatched communities", async () => {
    prisma.researchRequest.findUnique.mockResolvedValue({
      ...request,
      status: "PENDING",
    });
    await expect(
      service.create("researcher-1", {
        researchRequestId: "request-1",
        communityId: "community-1",
        description: "A meaningful community benefit.",
      }),
    ).rejects.toThrow("approved research request");

    prisma.researchRequest.findUnique.mockResolvedValue(request);
    await expect(
      service.create("researcher-1", {
        researchRequestId: "request-1",
        communityId: "community-2",
        description: "A meaningful community benefit.",
      }),
    ).rejects.toThrow("does not own");
  });

  it("accepts a pending agreement only for a governance member of the community", async () => {
    prisma.benefitAgreement.findUnique.mockResolvedValue({
      id: "agreement-1",
      communityId: "community-1",
      researchRequestId: "request-1",
      status: "PENDING",
      researchRequest: { status: "APPROVED", datasetId: "dataset-1" },
    });

    prisma.communityMembership.findUnique.mockResolvedValue({
      role: "GOVERNANCE_MEMBER",
    });
    transaction.benefitAgreement.update.mockResolvedValue({
      id: "agreement-1",
      acceptedById: "governance-1",
      acceptedAt: new Date(),
    });

    await service.accept("governance-1", "agreement-1");

    expect(transaction.benefitAgreement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "ACCEPTED",
          acceptedById: "governance-1",
          acceptedAt: expect.any(Date),
        },
      }),
    );
  });

  it("requires and stores a governance rejection note", async () => {
    prisma.benefitAgreement.findUnique.mockResolvedValue({
      id: "agreement-1",
      communityId: "community-1",
      researchRequestId: "request-1",
      status: "PENDING",
      researchRequest: { status: "APPROVED", datasetId: "dataset-1" },
    });
    prisma.communityMembership.findUnique.mockResolvedValue({
      role: "GOVERNANCE_MEMBER",
    });
    transaction.benefitAgreement.update.mockResolvedValue({
      id: "agreement-1",
      status: "REJECTED",
      rejectionReason: "Please clarify the community reporting commitment.",
    });

    const dto: RejectBenefitAgreementDto = {
      reason: "Please clarify the community reporting commitment.",
    };
    await service.reject("governance-1", "agreement-1", dto);

    expect(transaction.benefitAgreement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "REJECTED",
          rejectionReason: dto.reason,
        },
      }),
    );
  });

  it("preserves cancellation as a status update", async () => {
    prisma.benefitAgreement.findUnique.mockResolvedValue({
      id: "agreement-1",
      researcherId: "researcher-1",
      researchRequestId: "request-1",
      researchRequest: { datasetId: "dataset-1" },
    });
    transaction.benefitAgreement.update.mockResolvedValue({
      id: "agreement-1",
      status: "CANCELLED",
    });

    await service.update("researcher-1", "agreement-1", {
      status: "CANCELLED",
    });

    expect(transaction.benefitAgreement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CANCELLED" },
      }),
    );
  });
});
