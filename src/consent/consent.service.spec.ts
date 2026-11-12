import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { ConsentService } from "./consent.service";
import { AuditService } from "../audit/audit.service";

describe('ConsentService', () => {
  let service: ConsentService;
  const transaction = {
    consent: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma = {
    participant: { findUnique: jest.fn() },
    consent: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        PrismaService,
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    service = module.get<ConsentService>(ConsentService);
  });

  it("creates a version with all typed operation decisions", async () => {
    prisma.participant.findUnique.mockResolvedValue({
      id: "participant-1",
      datasetId: "dataset-1",
      communityId: "community-1",
    });
    transaction.consent.findFirst.mockResolvedValue({ version: 1 });
    transaction.consent.create.mockResolvedValue({ id: "consent-2" });

    await service.create("user-1", {
      purpose: "ACADEMIC",
      decisions: {
        ACADEMIC_AGGREGATE_RESEARCH: true,
        IDENTIFIABLE_RECORD_ACCESS: false,
        COMMERCIAL_AI_TRAINING: false,
      },
    });

    expect(transaction.consent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
        data: { status: "SUPERSEDED" },
      }),
    );
    expect(transaction.consent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 2,
          participantId: "participant-1",
          datasetId: "dataset-1",
          permissions: {
            create: [
              {
                operation: "ACADEMIC_AGGREGATE_RESEARCH",
                allowed: true,
                permission: "ACADEMIC_RESEARCH",
              },
              {
                operation: "IDENTIFIABLE_RECORD_ACCESS",
                allowed: false,
                permission: "IDENTIFIABLE_DATA",
              },
              {
                operation: "COMMERCIAL_AI_TRAINING",
                allowed: false,
                permission: "AI_MODEL_TRAINING",
              },
            ],
          },
        }),
      }),
    );
  });

  it("rejects incomplete or unknown operation decisions", async () => {
    prisma.participant.findUnique.mockResolvedValue({
      id: "participant-1",
      datasetId: "dataset-1",
    });

    await expect(
      service.create("user-1", {
        purpose: "ACADEMIC",
        decisions: {
          ACADEMIC_AGGREGATE_RESEARCH: true,
          IDENTIFIABLE_RECORD_ACCESS: false,
        } as never,
      }),
    ).rejects.toThrow("supported consent operations");
  });

  it("withdraws the latest active consent and is safe to repeat", async () => {
    prisma.participant.findUnique.mockResolvedValue({
      id: "participant-1",
      datasetId: "dataset-1",
    });
    prisma.consent.findFirst
      .mockResolvedValueOnce({ id: "consent-1", status: "ACTIVE" })
      .mockResolvedValueOnce({ id: "consent-1", status: "WITHDRAWN" });
    transaction.consent.update.mockResolvedValue({ id: "consent-1" });
    prisma.consent.findUnique.mockResolvedValue({ id: "consent-1" });

    await service.withdraw("user-1");
    await service.withdraw("user-1");

    expect(transaction.consent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "consent-1" },
        data: expect.objectContaining({ status: "WITHDRAWN" }),
      }),
    );
    expect(prisma.consent.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "consent-1" } }),
    );
  });
});
