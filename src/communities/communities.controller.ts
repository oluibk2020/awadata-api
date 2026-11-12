import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateCommunityDto } from "./dto/create-community.dto";
import { CommunitiesService } from "./communities.service";
import { IsUUID } from "class-validator";

class AssignGovernanceMemberDto {
  @IsUUID()
  userId: string;
}

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Post()
  @Roles("PLATFORM_ADMIN", "COMMUNITY_ADMIN")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  create(@Body() dto: CreateCommunityDto) {
    return this.communitiesService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"))
  findAll() {
    return this.communitiesService.findAll();
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"))
  findOne(@Param("id") id: string) {
    return this.communitiesService.findOne(id);
  }

  @Put(":id/governance-members")
  @Roles("PLATFORM_ADMIN")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  assignGovernanceMember(
    @Param("id") id: string,
    @Body() dto: AssignGovernanceMemberDto,
  ) {
    return this.communitiesService.assignGovernanceMember(id, dto.userId);
  }
}
