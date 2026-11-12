import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateDatasetDto } from "./dto/create-dataset.dto";
import { DatasetsService } from "./datasets.service";

@Controller("communities/:communityId/datasets")
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Post()
  @Roles("PLATFORM_ADMIN", "COMMUNITY_ADMIN")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  create(
    @Param("communityId") communityId: string,
    @Body() dto: CreateDatasetDto,
  ) {
    return this.datasetsService.create(communityId, dto);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"))
  findAll(@Param("communityId") communityId: string) {
    return this.datasetsService.findAll(communityId);
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"))
  findOne(
    @Param("communityId") communityId: string,
    @Param("id") id: string,
  ) {
    return this.datasetsService.findOne(communityId, id);
  }
}
