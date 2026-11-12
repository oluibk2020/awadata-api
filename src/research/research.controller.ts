import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { JwtUser } from "../auth/dto/jwt-user.interface";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateResearchRequestDto } from "./dto/create-research-request.dto";
import { ResearchService } from "./research.service";

@Controller("research/requests")
@Roles("RESEARCHER")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Post()
  create(
    @Req() req: Request & { user: JwtUser },
    @Body() dto: CreateResearchRequestDto,
  ) {
    return this.researchService.create(req.user.sub, dto);
  }

  @Get()
  findMine(@Req() req: Request & { user: JwtUser }) {
    return this.researchService.findMine(req.user.sub);
  }

  @Get(":id")
  findOne(
    @Req() req: Request & { user: JwtUser },
    @Param("id") id: string,
  ) {
    return this.researchService.findMineById(req.user.sub, id);
  }
}
