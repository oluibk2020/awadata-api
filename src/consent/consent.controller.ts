import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { JwtUser } from "../auth/dto/jwt-user.interface";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateConsentDto } from "./dto/create-consent.dto";
import { ConsentService } from "./consent.service";

@Controller("participants/me/consent")
@Roles("PARTICIPANT")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post()
  create(
    @Req() req: Request & { user: JwtUser },
    @Body() dto: CreateConsentDto,
  ) {
    return this.consentService.create(req.user.sub, dto);
  }

  @Get("current")
  getCurrent(@Req() req: Request & { user: JwtUser }) {
    return this.consentService.getCurrent(req.user.sub);
  }

  @Get("history")
  getHistory(@Req() req: Request & { user: JwtUser }) {
    return this.consentService.getHistory(req.user.sub);
  }

  @Post("withdraw")
  withdraw(@Req() req: Request & { user: JwtUser }) {
    return this.consentService.withdraw(req.user.sub);
  }
}
