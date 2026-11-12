import { Controller, Get, HttpStatus, Inject, Res } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Response } from "express";
import { PrismaService } from "./prisma/prisma.service";

export type HealthState = "HEALTHY" | "DEGRADED" | "UNHEALTHY";

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get("health")
  async health(@Res() res: Response) {
    let databaseStatus: HealthState = "UNHEALTHY";
    let redisStatus: HealthState = "DEGRADED";

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = "HEALTHY";
    } catch {
      databaseStatus = "UNHEALTHY";
    }

    try {
      const probeKey = "__health_probe__";
      await this.cacheManager.set(probeKey, "ok", 5000);
      const val = await this.cacheManager.get(probeKey);
      if (val === "ok") {
        redisStatus = "HEALTHY";
      }
    } catch {
      redisStatus = "DEGRADED";
    }

    let overallStatus: HealthState = "HEALTHY";
    let statusCode = HttpStatus.OK;

    if (databaseStatus === "UNHEALTHY") {
      overallStatus = "UNHEALTHY";
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
    } else if (redisStatus === "DEGRADED") {
      overallStatus = "DEGRADED";
      statusCode = HttpStatus.OK;
    }

    return res.status(statusCode).json({
      status: overallStatus,
      database: databaseStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  }
}
