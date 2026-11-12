import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import { JwtPayload } from "../jwt-payload.interface";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtUser } from "./jwt-user.interface";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Request } from "express";
import { getSessionCacheKey } from "../session-key";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super({
      secretOrKey: String(configService.get<string>("jwt.secret")), //should be in env file
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<JwtUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException();
    }

    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (!accessToken) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isBanned: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.isBanned ||
      user.email !== payload.email
    ) {
      throw new UnauthorizedException();
    }

    const session = await this.cacheManager.get(
      getSessionCacheKey(accessToken),
    );
    if (!session) {
      throw new UnauthorizedException();
    }

    return this.mapUserToJwtUser(user);
  }

  private mapUserToJwtUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: JwtUser["role"];
  }): JwtUser {
    return {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }
}
