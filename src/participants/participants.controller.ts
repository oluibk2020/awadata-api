import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateParticipantDto } from "./dto/create-participant.dto";
import { CreateOwnParticipantDto } from "./dto/create-own-participant.dto";
import { ParticipantsService } from "./participants.service";
import { Request } from "express";
import { JwtUser } from "../auth/dto/jwt-user.interface";

@Controller("communities/:communityId/datasets/:datasetId/participants")
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post("profile")
  @Roles("PARTICIPANT")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  createOwn(
    @Req() req: Request & { user: JwtUser },
    @Body() dto: CreateOwnParticipantDto,
  ) {
    return this.participantsService.createForUser(req.user.sub, dto);
  }

  @Post()
  @Roles("PLATFORM_ADMIN", "COMMUNITY_ADMIN")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  create(
    @Param("communityId") communityId: string,
    @Param("datasetId") datasetId: string,
    @Body() dto: CreateParticipantDto,
  ) {
    return this.participantsService.create(communityId, datasetId, dto);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"))
  findAll(
    @Param("communityId") communityId: string,
    @Param("datasetId") datasetId: string,
  ) {
    return this.participantsService.findAll(communityId, datasetId);
  }
}
