import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCommunityDto } from "./dto/create-community.dto";

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCommunityDto) {
    return this.prisma.community.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        country: dto.country.trim(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findAll() {
    return this.prisma.community.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!community) {
      throw new NotFoundException("Community not found");
    }

    return community;
  }

  async assignGovernanceMember(communityId: string, userId: string) {
    const [community, user] = await this.prisma.$transaction([
      this.prisma.community.findUnique({ where: { id: communityId }, select: { id: true } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, participantProfile: { select: { id: true } } },
      }),
    ]);
    if (!community) throw new NotFoundException("Community not found");
    if (!user) throw new NotFoundException("User not found");
    if (user.participantProfile) {
      throw new BadRequestException(
        "A participant account cannot also be assigned as a governance member",
      );
    }
    if (user.role !== "GOVERNANCE_MEMBER") {
      throw new BadRequestException(
        "Only users with the GOVERNANCE_MEMBER role can govern a community",
      );
    }

    return this.prisma.communityMembership.upsert({
      where: { userId_communityId: { userId, communityId } },
      create: { userId, communityId, role: "GOVERNANCE_MEMBER" },
      update: { role: "GOVERNANCE_MEMBER" },
      select: {
        id: true,
        userId: true,
        communityId: true,
        role: true,
        joinedAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }
}
