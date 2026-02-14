import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { ActivateWorkspaceAgentDto } from "./dto/activate-workspace-agent.dto";
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
