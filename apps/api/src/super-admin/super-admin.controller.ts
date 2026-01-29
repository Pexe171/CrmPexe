import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { SuperAdminGuard } from "../auth/super-admin.guard";
import { AuthUser } from "../auth/auth.types";
import { SuperAdminService } from "./super-admin.service";
import { CreateSupportImpersonationDto } from "./dto/create-support-impersonation.dto";

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

  @Get("workspaces/:workspaceId/members")
  async listWorkspaceMembers(@Param("workspaceId") workspaceId: string) {
    return this.superAdminService.listWorkspaceMembers(workspaceId);
  }

  @Post("workspaces/:workspaceId/impersonate")
  async createSupportImpersonation(
    @CurrentUser() user: AuthUser,
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateSupportImpersonationDto
  ) {
    return this.superAdminService.createSupportImpersonationToken(
      user.id,
      workspaceId,
      body.userId
    );
  }
}
