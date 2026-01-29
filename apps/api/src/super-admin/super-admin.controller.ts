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
    @Query("perPage") perPage?: string,
    @Query("search") search?: string
  ) {
    const parsedPage = Number(page);
    const parsedPerPage = Number(perPage);

    return this.superAdminService.listWorkspaces({
      page: Number.isFinite(parsedPage) ? parsedPage : undefined,
      perPage: Number.isFinite(parsedPerPage) ? parsedPerPage : undefined,
      search
    });
  }

  @Get("error-logs")
  async listErrorLogs(
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
    @Query("workspaceId") workspaceId?: string
  ) {
    const parsedPage = Number(page);
    const parsedPerPage = Number(perPage);

    return this.superAdminService.listErrorLogs({
      page: Number.isFinite(parsedPage) ? parsedPage : undefined,
      perPage: Number.isFinite(parsedPerPage) ? parsedPerPage : undefined,
      workspaceId
    });
  }
}
