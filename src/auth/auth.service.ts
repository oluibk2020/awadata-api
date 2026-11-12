import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { AuthCredentialsDto } from "./dto/auth-credentials.dto";
import { JwtPayload } from "./jwt-payload.interface";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Message, ResponseMessage } from "src/helpers/message.interface";
import { TwoFactorService } from "./services/two-factor.service";
import type { UserModel } from "../../generated/prisma/models/User";
import { getSessionCacheKey } from "./session-key";
import { randomUUID } from "node:crypto";

export interface AuthenticatedUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserModel["role"];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private twoFactorService: TwoFactorService,
  ) {}

  async signIn(authCredentialsDto: AuthCredentialsDto): Promise<{
    accessToken?: string;
    requires2fa?: boolean;
    sessionId?: string;
  }> {
    const email = authCredentialsDto.email.trim().toLowerCase();
    const { password } = authCredentialsDto;

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      if (!user.isActive || user.isBanned) {
        throw new UnauthorizedException("Invalid login credentials");
      }
      // If 2FA enabled, require verification
      if (user.twoFactorEnabled) {
        const sessionId = `2fa_session:${randomUUID()}`;
        await this.cacheManager.set(
          sessionId,
          JSON.stringify({ userId: user.id }),
          5 * 60 * 1000, // 5 minutes
        );

        return {
          requires2fa: true,
          sessionId,
        };
      }

      // Otherwise return token directly
      return this.generateAccessToken(user);
    } else {
      throw new UnauthorizedException("Invalid login credentials");
    }
  }

  private async generateAccessToken(
    user: Pick<UserModel, "id" | "email" | "role">,
  ): Promise<{ accessToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken: string = this.jwtService.sign(payload);

    // Cache this token session for the duration of the access-token session.
    const cacheKey = getSessionCacheKey(accessToken);
    await this.cacheManager.set(
      cacheKey,
      JSON.stringify({ userId: user.id }),
      60 * 60_000,
    );

    return { accessToken };
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Authenticated user not found");
    }

    return user;
  }

  async initiate2fa(email: string): Promise<{
    manualKey: string;
    qrCode: string;
  }> {
    const { secret, qrCode } = this.twoFactorService.generateSecret(email);
    const qrCodeDataUrl = await this.twoFactorService.generateQRCode(qrCode);

    // Store temporary secret in cache (10 minutes)
    await this.cacheManager.set(
      `2fa_temp_secret:${email}`,
      secret,
      10 * 60 * 1000,
    );

    return {
      manualKey: secret, // Share this as backup
      qrCode: qrCodeDataUrl,
    };
  }

  async setup2fa(
    email: string,
    token: string,
  ): Promise<{
    backupCodes: string[];
    message: string;
  }> {
    const tempSecret = await this.cacheManager.get<string>(
      `2fa_temp_secret:${email}`,
    );

    if (!tempSecret) {
      throw new UnauthorizedException(
        "2FA setup expired. Please initiate again.",
      );
    }

    const isValid = this.twoFactorService.verifyToken(tempSecret, token);
    if (!isValid) {
      throw new UnauthorizedException("Invalid 2FA token");
    }

    const backupCodes = this.twoFactorService.generateBackupCodes();
    const hashedBackupCodes =
      await this.twoFactorService.hashBackupCodes(backupCodes);

    // Save to database
    await this.prisma.user.update({
      where: { email },
      data: {
        twoFactorSecret: tempSecret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    // Clear temporary secret
    await this.cacheManager.del(`2fa_temp_secret:${email}`);

    return {
      backupCodes,
      message: "Two-factor authentication enabled successfully",
    };
  }

  async disable2fa(email: string, token: string): Promise<ResponseMessage> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException("2FA not enabled");
    }

    const isValid = this.twoFactorService.verifyToken(
      user.twoFactorSecret,
      token,
    );
    if (!isValid) {
      throw new UnauthorizedException("Invalid 2FA token");
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: [],
      },
    });

    return { message: Message.success };
  }

  async verify2faToken(
    userId: string,
    token: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.isBanned) {
      throw new UnauthorizedException("Invalid login credentials");
    }
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException("2FA not enabled");
    }

    // Try TOTP first
    const isTotpValid = this.twoFactorService.verifyToken(
      user.twoFactorSecret,
      token,
    );

    if (isTotpValid) {
      return this.generateAccessToken(user);
    }

    // Try backup code
    const backupCodes = user.twoFactorBackupCodes || [];
    const { valid, remainingCodes } =
      await this.twoFactorService.verifyBackupCode(
      backupCodes,
      token,
      );

    if (!valid) {
      throw new UnauthorizedException("Invalid 2FA token or backup code");
    }

    // Update backup codes
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: remainingCodes },
    });

    return this.generateAccessToken(user);
  }

  //check 2FA status
  async check2faStatus(email: string): Promise<{ is2faEnabled: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return { is2faEnabled: user.twoFactorEnabled };
  }

  async logout(accessToken: string): Promise<ResponseMessage> {
    if (!accessToken) {
      throw new UnauthorizedException("Authorization token required");
    }

    await this.cacheManager.del(getSessionCacheKey(accessToken));

    return { message: Message.success };
  }
}
