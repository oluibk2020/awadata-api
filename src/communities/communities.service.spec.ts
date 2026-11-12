import { Test, TestingModule } from '@nestjs/testing';
import { CommunitiesService } from './communities.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommunitiesService', () => {
  let service: CommunitiesService;
  const prisma = {
    community: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunitiesService, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    service = module.get<CommunitiesService>(CommunitiesService);
  });

  it("creates a trimmed community", async () => {
    prisma.community.create.mockResolvedValue({ id: "community-1" });

    await service.create({
      name: "  Demo Community ",
      description: "  Synthetic community ",
      country: "  Ghana ",
    });

    expect(prisma.community.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: "Demo Community",
          description: "Synthetic community",
          country: "Ghana",
        },
      }),
    );
  });

  it("rejects a missing community", async () => {
    prisma.community.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow(
      "Community not found",
    );
  });
});
