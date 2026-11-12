import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { JwtUser } from "../auth/dto/jwt-user.interface";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthorizeAccessDto } from "./dto/authorize-access.dto";
import { AuthorizationService } from "./authorization.service";

@Controller("access")
@Roles("RESEARCHER")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @Post("authorize")
  authorize(
    @Req() req: Request & { user: JwtUser },
    @Body() dto: AuthorizeAccessDto,
  ) {
    return this.authorizationService.evaluate(
      req.user.sub,
      dto.researchRequestId,
      dto.operation,
    );
  }

  @Post("execute")
  execute(
    @Req() req: Request & { user: JwtUser },
    @Body() dto: AuthorizeAccessDto,
  ) {
    return this.authorizationService.execute(
      req.user.sub,
      dto.researchRequestId,
      dto.operation,
    );
  }
}
