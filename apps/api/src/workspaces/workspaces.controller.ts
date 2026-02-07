import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { AuditEntity } from "../audit-logs/audit-log.decorator";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { ExportWorkspaceQueryDto } from "./dto/export-workspace-query.dto";
import { RequestWorkspaceDeletionDto } from "./dto/request-workspace-deletion.dto";
import { UpdateWorkspaceBrandingDto } from "./dto/update-workspace-branding.dto";
import { UpdateWorkspaceMemberPoliciesDto } from "./dto/update-workspace-member-policies.dto";
import { WorkspacesService } from "./workspaces.service";

@Controller("workspaces")
@UseGuards(AccessTokenGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @AuditEntity({
    entity: "Workspace",
    entityId: { source: "response", key: "id" },
    workspaceId: { source: "response", key: "id" },
    metadata: (request) => ({
      name: request.body?.name
    })
  })
  async createWorkspace(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateWorkspaceDto
  ) {
    return this.workspacesService.createWorkspace(user.id, body.name);
  }

  @Get()
  async listWorkspaces(@CurrentUser() user: AuthUser) {
    return this.workspacesService.listWorkspaces(user.id);
  }

  @Get("current")
  async getCurrentWorkspace(@CurrentUser() user: AuthUser) {
    return this.workspacesService.getCurrentWorkspace(user.id);
  }

  @Post(":id/switch")
  async switchWorkspace(
    @CurrentUser() user: AuthUser,
    @Param("id") workspaceId: string
  ) {
    return this.workspacesService.switchWorkspace(user.id, workspaceId);
  }

  @Patch(":id/branding")
  @AuditEntity({
    entity: "Workspace",
    action: "UPDATE",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "param", key: "id" },
    metadata: (request) => ({
      brandName: request.body?.brandName ?? null,
      brandLogoUrl: request.body?.brandLogoUrl ?? null,
      brandPrimaryColor: request.body?.brandPrimaryColor ?? null,
      brandSecondaryColor: request.body?.brandSecondaryColor ?? null,
      customDomain: request.body?.customDomain ?? null,
      locale: request.body?.locale ?? null
    })
  })
  async updateWorkspaceBranding(
    @CurrentUser() user: AuthUser,
    @Param("id") workspaceId: string,
    @Body() body: UpdateWorkspaceBrandingDto
  ) {
    return this.workspacesService.updateWorkspaceBranding(
      user.id,
      workspaceId,
      body
    );
  }

  @Patch(":id/members/:memberId/policies")
  @AuditEntity({
    entity: "WorkspaceMember",
    action: "UPDATE",
    entityId: { source: "param", key: "memberId" },
    workspaceId: { source: "param", key: "id" },
    metadata: (request) => ({
      allowedTagIds: request.body?.allowedTagIds ?? null,
      allowedUnitIds: request.body?.allowedUnitIds ?? null
    })
  })
  async updateWorkspaceMemberPolicies(
    @CurrentUser() user: AuthUser,
    @Param("id") workspaceId: string,
    @Param("memberId") memberId: string,
    @Body() body: UpdateWorkspaceMemberPoliciesDto
  ) {
    return this.workspacesService.updateWorkspaceMemberPolicies({
      requesterId: user.id,
      workspaceId,
      memberUserId: memberId,
      allowedTagIds: body.allowedTagIds,
      allowedUnitIds: body.allowedUnitIds
    });
  }

  @Get(":id/export")
  @AuditEntity({
    entity: "Workspace",
    action: "UPDATE",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "param", key: "id" },
    metadata: (request) => ({
      formato: request.query?.format ?? "json"
    })
  })
  async exportWorkspace(
    @CurrentUser() user: AuthUser,
    @Param("id") workspaceId: string,
    @Query() query: ExportWorkspaceQueryDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const exportData = await this.workspacesService.exportWorkspaceData(
      user.id,
      workspaceId
    );
    const format = query.format ?? "json";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "zip") {
      const archiverModule = await import("archiver");
      const archiver = archiverModule.default ?? archiverModule;
      const filename = `workspace-${workspaceId}-export-${timestamp}.zip`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      return new Promise<void>((resolve, reject) => {
        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.on("error", (error) => reject(error));
        res.on("close", () => resolve());
        archive.pipe(res);
        archive.append(JSON.stringify(exportData, null, 2), {
          name: "workspace-export.json"
        });
        archive.finalize();
      });
    }

    const filename = `workspace-${workspaceId}-export-${timestamp}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return exportData;
  }

  @Delete(":id")
  @AuditEntity({
    entity: "Workspace",
    action: "DELETE",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "param", key: "id" },
    metadata: (request, response) => ({
      motivo: request.body?.reason,
      retentionEndsAt:
        (response as { retentionEndsAt?: string | null } | undefined)
          ?.retentionEndsAt ?? null
    })
  })
  async requestWorkspaceDeletion(
    @CurrentUser() user: AuthUser,
    @Param("id") workspaceId: string,
    @Body() body: RequestWorkspaceDeletionDto
  ) {
    return this.workspacesService.requestWorkspaceDeletion(
      user.id,
      workspaceId,
      body.reason
    );
  }
}
