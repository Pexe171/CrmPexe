import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { SuperAdminGuard } from "../auth/super-admin.guard";
import { SuperAdminService } from "./super-admin.service";

@Controller("super-admin")
@UseGuards(AccessTokenGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get("workspaces")
  async listWorkspaces(
    @Query("page") page?: string,
    @Query("perPage") perPage?: string
  ) {
    return this.superAdminService.listWorkspaces({
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined
    });
  }

  @Get("error-logs")
  async listErrorLogs(
    @Query("workspaceId") workspaceId?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string
  ) {
    return this.superAdminService.listErrorLogs(workspaceId, {
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined
    });
  }
}
