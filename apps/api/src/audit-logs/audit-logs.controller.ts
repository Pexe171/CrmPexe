import { Controller, Get, Headers, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { AuditLogsService } from "./audit-logs.service";

@Controller("audit-logs")
@UseGuards(AccessTokenGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async listAuditLogs(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string
  ) {
    const parsedPage = Number(page);
    const parsedPerPage = Number(perPage);

    return this.auditLogsService.listAuditLogs(
      user.id,
      Number.isFinite(parsedPage) ? parsedPage : undefined,
      Number.isFinite(parsedPerPage) ? parsedPerPage : undefined,
      workspaceId
    );
  }
}
