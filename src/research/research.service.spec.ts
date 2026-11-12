import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { ResearchService } from "./research.service";
import { AuditService } from "../audit/audit.service";

describe("ResearchService", () => {
  let service: ResearchService;
  const prisma = {
    dataset: { findUnique: jest.fn() },
    researchRequest: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const transaction = {
    dataset: prisma.dataset,
    researchRequest: prisma.researchRequest,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResearchService,
        PrismaService,
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    service = module.get(ResearchService);
  });

  it("creates a request for the authenticated researcher", async () => {
    prisma.dataset.findUnique.mockResolvedValue({
      id: "dataset-1",
      communityId: "community-1",
    });
    prisma.researchRequest.create.mockResolvedValue({ id: "request-1" });

    await service.create("researcher-1", {
      datasetId: "dataset-1",
      title: "Synthetic aggregate study",
      description: "Evaluate synthetic aggregate patterns.",
      purpose: "ACADEMIC",
      operations: ["ACADEMIC_AGGREGATE_RESEARCH"],
    });

    expect(transaction.researchRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          researcherId: "researcher-1",
          requestedConsentOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
        }),
      }),
    );
  });

  it("only retrieves the authenticated researcher's request", async () => {
    prisma.researchRequest.findFirst.mockResolvedValue({ id: "request-1" });

    await service.findMineById("researcher-1", "request-1");

    expect(prisma.researchRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "request-1", researcherId: "researcher-1" },
      }),
    );
  });
});
