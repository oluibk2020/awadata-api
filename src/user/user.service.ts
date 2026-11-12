import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

import bcrypt from "bcrypt";
import { RegisterCredentialsDto } from "src/user/dto/register-credentials.dto";
import { Message, ResponseMessage } from "../helpers/message.interface";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

export interface CreateUserOptions {
  referralCode?: string;
  invitation?: boolean;
}

@Injectable()
export class UserService {
  private readonly SUBSCRIPTION_CACHE_VERSION_KEY =
    "subscriptions_cache_version";

  private readonly TRANSACTION_CACHE_VERSION_KEY = "transactions_cache_version";
  private readonly USER_CACHE_VERSION_KEY = "users_cache_version";
  constructor(
    private prisma: PrismaService,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async bumpUserCacheVersion(): Promise<void> {
    const newVersion = Date.now(); // unique and always increasing

    await this.cacheManager.set(
      this.USER_CACHE_VERSION_KEY,
      newVersion,
      0, // no TTL
    );
  }

  private async getUserCacheVersion(): Promise<number> {
    const version = await this.cacheManager.get<number>(
      this.USER_CACHE_VERSION_KEY,
    );

    return version ?? 1;
  }

  private async bumpSubscriptionCacheVersion(): Promise<void> {
    const newVersion = Date.now(); // unique and always increasing

    await this.cacheManager.set(
      this.SUBSCRIPTION_CACHE_VERSION_KEY,
      newVersion,
      30 * 60 * 1000, // 30 mins
    );
  }

  private async bumpTransactionCacheVersion(): Promise<void> {
    const newVersion = Date.now(); // unique and always increasing

    await this.cacheManager.set(
      this.TRANSACTION_CACHE_VERSION_KEY,
      newVersion,
      30 * 60 * 1000, // 30 mins
    );
  }

  async getUsers() {
    const version = await this.getUserCacheVersion();
    const cacheKey = `v${version}_all_users`;

    // 🔍 Step 1: Check cache first
    const cachedUsers = await this.cacheManager.get(cacheKey);

    if (cachedUsers) {
      // console.log('⚡ Returning users from Redis cache');
      return cachedUsers;
    }

    const users = await this.prisma.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // 💾 Step 3: Save to cache for 60 seconds
    await this.cacheManager.set(cacheKey, users, 2_600_000);

    return users;
  }

  async getDirectory() {
    return this.prisma.user.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        participantProfile: { select: { id: true } },
        memberships: {
          select: { communityId: true, role: true },
        },
      },
    });
  }

  // Update user profile names.
  async updateUser(
    email: string,
    firstName?: string,
    lastName?: string
  ): Promise<ResponseMessage> {
    await this.bumpUserCacheVersion();

    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: { firstName, lastName },
    });

    return { message: Message.success };
  }

  async getUserByEmail(email: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    id: string;
    role: string;
  }> {
    const version = await this.getUserCacheVersion();
    const cacheKey = `v${version}_user:${email}`;

    // 🔍 1. Check Redis cache first
    const cachedUser:
      | {
          email: string;
          firstName: string;
          lastName: string;
          id: string;
          role: string;
        }
      | undefined = await this.cacheManager.get(cacheKey);
    if (cachedUser) {
      // console.log('⚡ User returned from Redis cache');
      return cachedUser;
    }

    console.log("got here user", email);
    const found = await this.prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!found) {
      throw new NotFoundException("User not found");
    } else {
      // 💾 3. Store in Redis for 60 * 60 seconds
      await this.cacheManager.set(cacheKey, found, 2_600_000);

      return found;
    }
  }

  //create user
  async createUser(
    registerCredentialsDto: RegisterCredentialsDto,
    options: CreateUserOptions = {},
  ): Promise<ResponseMessage> {
    const { password, firstName, lastName } = registerCredentialsDto;
    const email = registerCredentialsDto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException("User already exists. Please login.");
    }

    await this.bumpUserCacheVersion();

    //hash the password
    const saltRounds: number = 10;
    const salt: string = await bcrypt.genSalt(saltRounds);
    const hashedPassword: string = await bcrypt.hash(password, salt);

    // Keep user setup and attribution together so partial bulk imports cannot leave
    // behind a user without its referral, wallet, subscription, or trial records.
    const createdUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          passwordHash: hashedPassword,
          email,
          firstName,
          lastName,
        },
      });

      return user;
    });

    return { message: Message.success };
  }
}
