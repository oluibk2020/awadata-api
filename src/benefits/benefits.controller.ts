import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { JwtUser } from "../auth/dto/jwt-user.interface";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateBenefitAgreementDto } from "./dto/create-benefit-agreement.dto";
import { UpdateBenefitAgreementDto } from "./dto/update-benefit-agreement.dto";
import { RejectBenefitAgreementDto } from "./dto/reject-benefit-agreement.dto";
import { BenefitsService } from "./benefits.service";

@Controller("benefits")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Post("agreements")
  @Roles("RESEARCHER")
  create(
    @Req() req: Request & { user: JwtUser },
    @Body() dto: CreateBenefitAgreementDto,
  ) {
    return this.benefitsService.create(req.user.sub, dto);
  }

  @Get("requests/:requestId/agreement")
  @Roles("RESEARCHER", "GOVERNANCE_MEMBER")
  findByRequest(
    @Req() req: Request & { user: JwtUser },
    @Param("requestId") requestId: string,
  ) {
    return this.benefitsService.findByRequest(req.user.sub, req.user.role, requestId);
  }

  @Get("requests/:requestId/agreements")
  @Roles("RESEARCHER", "GOVERNANCE_MEMBER")
  findVersionsByRequest(
    @Req() req: Request & { user: JwtUser },
    @Param("requestId") requestId: string,
  ) {
    return this.benefitsService.findVersionsByRequest(req.user.sub, req.user.role, requestId);
  }

  @Patch("agreements/:id")
  @Roles("RESEARCHER")
  update(
    @Req() req: Request & { user: JwtUser },
    @Param("id") id: string,
    @Body() dto: UpdateBenefitAgreementDto,
  ) {
    return this.benefitsService.update(req.user.sub, id, dto);
  }

  @Post("agreements/:id/accept")
  @Roles("GOVERNANCE_MEMBER")
  accept(
    @Req() req: Request & { user: JwtUser },
    @Param("id") id: string,
  ) {
    return this.benefitsService.accept(req.user.sub, id);
  }

  @Post("agreements/:id/reject")
  @Roles("GOVERNANCE_MEMBER")
  reject(
    @Req() req: Request & { user: JwtUser },
    @Param("id") id: string,
    @Body() dto: RejectBenefitAgreementDto,
  ) {
    return this.benefitsService.reject(req.user.sub, id, dto);
  }
}
