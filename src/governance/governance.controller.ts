import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { JwtUser } from "../auth/dto/jwt-user.interface";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { GovernanceDecisionDto } from "./dto/governance-decision.dto";
import { GovernanceService } from "./governance.service";

@Controller("governance")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get("requests/pending")
  @Roles("GOVERNANCE_MEMBER")
  findPending(@Req() req: Request & { user: JwtUser }) {
    return this.governanceService.findPending(req.user.sub);
  }

  @Get("requests")
  @Roles("GOVERNANCE_MEMBER")
  findRequests(
    @Req() req: Request & { user: JwtUser },
    @Query("search") search?: string,
    @Query("status") status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED",
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "10",
  ) {
    return this.governanceService.findRequests(req.user.sub, {
      search: search?.trim() || undefined,
      status,
      from: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      to: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(50, Math.max(1, Number(limit) || 10)),
    });
  }

  @Get("benefit-agreements")
  @Roles("GOVERNANCE_MEMBER")
  findBenefitAgreements(
    @Req() req: Request & { user: JwtUser },
    @Query("search") search?: string,
    @Query("status") status?: "PENDING" | "ACCEPTED" | "REJECTED" | "COMMITTED" | "FULFILLED" | "CANCELLED",
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "10",
  ) {
    return this.governanceService.findBenefitAgreements(req.user.sub, {
      search: search?.trim() || undefined,
      status,
      from: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      to: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(50, Math.max(1, Number(limit) || 10)),
    });
  }

  @Get("requests/:requestId/decision")
  @Roles("RESEARCHER", "GOVERNANCE_MEMBER")
  getDecision(
    @Req() req: Request & { user: JwtUser },
    @Param("requestId") requestId: string,
  ) {
    return this.governanceService.getDecision(
      requestId,
      req.user.sub,
      req.user.role,
    );
  }

  @Post("requests/:requestId/approve")
  @Roles("GOVERNANCE_MEMBER")
  approve(
    @Req() req: Request & { user: JwtUser },
    @Param("requestId") requestId: string,
    @Body() dto: GovernanceDecisionDto,
  ) {
    return this.governanceService.decide(
      requestId,
      req.user.sub,
      "APPROVED",
      dto,
    );
  }

  @Post("requests/:requestId/reject")
  @Roles("GOVERNANCE_MEMBER")
  reject(
    @Req() req: Request & { user: JwtUser },
    @Param("requestId") requestId: string,
    @Body() dto: GovernanceDecisionDto,
  ) {
    return this.governanceService.decide(
      requestId,
      req.user.sub,
      "REJECTED",
      dto,
    );
  }
}
