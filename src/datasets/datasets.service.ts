import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDatasetDto } from "./dto/create-dataset.dto";

@Injectable()
export class DatasetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(communityId: string, dto: CreateDatasetDto) {
    await this.ensureCommunity(communityId);

    return this.prisma.dataset.create({
      data: {
        communityId,
        name: dto.name.trim(),
        description: `Synthetic demonstration data. ${dto.description?.trim() ?? ""}`.trim(),
        status: dto.status,
      },
      select: {
        id: true,
        communityId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(communityId: string) {
    await this.ensureCommunity(communityId);

    return this.prisma.dataset.findMany({
      where: { communityId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        communityId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(communityId: string, id: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id, communityId },
      select: {
        id: true,
        communityId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dataset) {
      throw new NotFoundException("Dataset not found");
    }

    return dataset;
  }

  private async ensureCommunity(communityId: string): Promise<void> {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true },
    });

    if (!community) {
      throw new BadRequestException("Community not found");
    }
  }
}
