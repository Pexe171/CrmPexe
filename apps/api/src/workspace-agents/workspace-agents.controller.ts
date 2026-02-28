import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { ActivateWorkspaceAgentDto } from "./dto/activate-workspace-agent.dto";
import { AssignAgentToWorkspaceDto } from "./dto/assign-agent-to-workspace.dto";
import { ListWorkspaceAgentsQueryDto } from "./dto/list-workspace-agents-query.dto";
import { WorkspaceAgentsService } from "./workspace-agents.service";

@Controller("workspace-agents")
@UseGuards(AccessTokenGuard)
export class WorkspaceAgentsController {
  constructor(private readonly service: WorkspaceAgentsService) {}

  @Get("catalog")
  async catalog(@CurrentUser() user: AuthUser) {
    return this.service.catalog(user);
  }

  @Get("admin/workspaces")
  async listAllWorkspaces(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string
  ) {
    return this.service.listAllWorkspaces(user, search);
  }

  @Get("admin/workspaces/:workspaceId/agents")
  async getWorkspaceAgents(
    @CurrentUser() user: AuthUser,
    @Param("workspaceId") workspaceId: string
  ) {
    return this.service.getWorkspaceAgentsByWorkspaceId(user, workspaceId);
  }

  @Post("admin/assign")
  async assignToWorkspace(
    @CurrentUser() user: AuthUser,
    @Body() body: AssignAgentToWorkspaceDto
  ) {
    return this.service.assignToWorkspace(
      user,
      body.workspaceId,
      body.agentTemplateId,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
      body.configJson
    );
  }

  @Post(":agentTemplateId/activate")
  async activate(
    @CurrentUser() user: AuthUser,
    @Param("agentTemplateId") agentTemplateId: string,
    @Body() body: ActivateWorkspaceAgentDto
  ) {
    const parsedVersion = body.version ? Number(body.version) : undefined;

    return this.service.activate(
      user,
      agentTemplateId,
      Number.isFinite(parsedVersion) ? parsedVersion : undefined,
      body.configJson
    );
  }

  @Post(":agentTemplateId/deactivate")
  async deactivate(
    @CurrentUser() user: AuthUser,
    @Param("agentTemplateId") agentTemplateId: string
  ) {
    return this.service.deactivate(user, agentTemplateId);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListWorkspaceAgentsQueryDto
  ) {
    return this.service.listWorkspaceAgents(user, query.isActive);
  }
}
