import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateParticipantDto } from "./dto/create-participant.dto";
import { CreateOwnParticipantDto } from "./dto/create-own-participant.dto";

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string, dto: CreateOwnParticipantDto) {
    const existing = await this.prisma.participant.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException("Participant profile already exists");
    }

    const dataset = await this.prisma.dataset.findFirst({
      where: { id: dto.datasetId, communityId: dto.communityId },
      select: { id: true },
    });

    if (!dataset) {
      throw new BadRequestException(
        "Dataset does not belong to the requested community",
      );
    }

    return this.prisma.participant.create({
      data: {
        userId,
        communityId: dto.communityId,
        datasetId: dto.datasetId,
        subjectCode: dto.subjectCode.trim(),
      },
      select: {
        id: true,
        communityId: true,
        datasetId: true,
        subjectCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(
    communityId: string,
    datasetId: string,
    dto: CreateParticipantDto,
  ) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, communityId },
      select: { id: true },
    });

    if (!dataset) {
      throw new BadRequestException(
        "Dataset does not belong to the requested community",
      );
    }

    if (dto.userId && (dto.email || dto.firstName || dto.lastName)) {
      throw new BadRequestException(
        "Choose an existing user or provide new account details, not both",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let userId = dto.userId;
      let generatedPassword: string | undefined;

      if (userId) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, participantProfile: { select: { id: true } } },
        });
        if (!user) {
          throw new NotFoundException("Selected user not found");
        }
        if (user.participantProfile) {
          throw new ConflictException("Selected user is already a participant");
        }
        if (user.role !== "PARTICIPANT") {
          throw new BadRequestException(
            "Only registered users with the PARTICIPANT role can be assigned as participants",
          );
        }
      } else {
        if (!dto.email || !dto.firstName || !dto.lastName) {
          throw new BadRequestException(
            "Provide email, first name and last name to create a participant account",
          );
        }
        const email = dto.email.trim().toLowerCase();
        const existing = await tx.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException(
            "A user with this email already exists; select that registered user instead",
          );
        }
        generatedPassword = this.generateTemporaryPassword();
        const passwordHash = await bcrypt.hash(generatedPassword, 10);
        const user = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            passwordHash,
            role: "PARTICIPANT",
          },
          select: { id: true },
        });
        userId = user.id;
      }

      const participant = await tx.participant.create({
        data: {
          userId,
          communityId,
          datasetId,
          subjectCode: dto.subjectCode.trim(),
        },
        select: {
          id: true,
          userId: true,
          communityId: true,
          datasetId: true,
          subjectCode: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
        },
      });

      return {
        ...participant,
        generatedPassword,
      };
    });
  }

  async findAll(communityId: string, datasetId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, communityId },
      select: { id: true },
    });

    if (!dataset) {
      throw new NotFoundException("Dataset not found");
    }

    return this.prisma.participant.findMany({
      where: { communityId, datasetId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        communityId: true,
        datasetId: true,
        subjectCode: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private generateTemporaryPassword() {
    const random = randomBytes(18).toString("base64url").replace(/[^A-Za-z0-9]/g, "");
    return `Aw@${random}9_`;
  }
}
