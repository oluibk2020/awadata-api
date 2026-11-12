import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuditRecord, AuditService } from "./audit.service";

@Controller("audit/events")
@Roles("PLATFORM_ADMIN", "AUDITOR")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findEvents(
    @Query("researchRequestId") researchRequestId?: string,
    @Query("datasetId") datasetId?: string,
    @Query("eventType") eventType?: AuditRecord["eventType"],
    @Query("outcome") outcome?: AuditRecord["outcome"],
    @Query("page") page = "1",
    @Query("limit") limit = "50",
  ) {
    return this.auditService.findEvents({
      researchRequestId,
      datasetId,
      eventType,
      outcome,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 50)),
    });
  }
}
