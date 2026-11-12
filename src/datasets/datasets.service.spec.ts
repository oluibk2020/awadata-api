import { Test, TestingModule } from '@nestjs/testing';
import { DatasetsService } from './datasets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DatasetsService', () => {
  let service: DatasetsService;
  const prisma = {
    community: { findUnique: jest.fn() },
    dataset: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatasetsService, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    service = module.get<DatasetsService>(DatasetsService);
  });

  it("marks created datasets as synthetic", async () => {
    prisma.community.findUnique.mockResolvedValue({ id: "community-1" });
    prisma.dataset.create.mockResolvedValue({ id: "dataset-1" });

    await service.create("community-1", {
      name: "Mental Health Demo",
      description: "Aggregate research fixture",
    });

    expect(prisma.dataset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: "community-1",
          description: "Synthetic demonstration data. Aggregate research fixture",
        }),
      }),
    );
  });

  it("rejects dataset creation for a missing community", async () => {
    prisma.community.findUnique.mockResolvedValue(null);

    await expect(
      service.create("missing", { name: "Dataset" }),
    ).rejects.toThrow("Community not found");
  });
});
