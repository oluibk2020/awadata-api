import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantsService } from './participants.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  const prisma = {
    dataset: { findFirst: jest.fn() },
    participant: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParticipantsService, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    service = module.get<ParticipantsService>(ParticipantsService);
  });

  it("creates a linked participant account with a generated password", async () => {
    prisma.dataset.findFirst.mockResolvedValue({ id: "dataset-1" });
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "user-1" }),
      },
      participant: {
        create: jest.fn().mockResolvedValue({ id: "participant-1" }),
      },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    const result = await service.create("community-1", "dataset-1", {
      subjectCode: "  SYN-001 ",
      email: "participant@example.com",
      firstName: "Synthetic",
      lastName: "Participant",
    });

    expect(tx.participant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: "user-1",
          communityId: "community-1",
          datasetId: "dataset-1",
          subjectCode: "SYN-001",
        },
      }),
    );
    expect(result.generatedPassword).toEqual(expect.any(String));
  });

  it("rejects a dataset from another community", async () => {
    prisma.dataset.findFirst.mockResolvedValue(null);

    await expect(
      service.create("community-1", "other-dataset", {
        subjectCode: "SYN-001",
      }),
    ).rejects.toThrow("Dataset does not belong to the requested community");
  });

  it("creates an owned profile from the authenticated user ID", async () => {
    prisma.participant.findUnique.mockResolvedValue(null);
    prisma.dataset.findFirst.mockResolvedValue({ id: "dataset-1" });
    prisma.participant.create.mockResolvedValue({ id: "participant-1" });

    await service.createForUser("user-1", {
      communityId: "community-1",
      datasetId: "dataset-1",
      subjectCode: "SYN-002",
    });

    expect(prisma.participant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          communityId: "community-1",
          datasetId: "dataset-1",
        }),
      }),
    );
  });
});
