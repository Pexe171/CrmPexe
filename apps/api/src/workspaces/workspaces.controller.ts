import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { WorkspacesService } from "./workspaces.service";

@Controller("workspaces")
@UseGuards(AccessTokenGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async createWorkspace(@CurrentUser() user: AuthUser, @Body() body: CreateWorkspaceDto) {
    return this.workspacesService.createWorkspace(user.id, body.name);
  }

  @Get()
  async listWorkspaces(@CurrentUser() user: AuthUser) {
    return this.workspacesService.listWorkspaces(user.id);
  }

  @Post(":id/switch")
  async switchWorkspace(@CurrentUser() user: AuthUser, @Param("id") workspaceId: string) {
    return this.workspacesService.switchWorkspace(user.id, workspaceId);
  }
}
