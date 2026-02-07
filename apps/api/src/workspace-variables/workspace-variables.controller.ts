import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { UpsertWorkspaceVariableDto } from "./dto/upsert-workspace-variable.dto";
import { WorkspaceVariablesService } from "./workspace-variables.service";

@Controller("workspace-variables")
@UseGuards(AccessTokenGuard)
export class WorkspaceVariablesController {
  constructor(
    private readonly workspaceVariablesService: WorkspaceVariablesService
  ) {}

  @Get()
  async listVariables(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.workspaceVariablesService.listVariables(user.id, workspaceId);
  }

  @Post()
  async upsertVariable(
    @CurrentUser() user: AuthUser,
    @Body() body: UpsertWorkspaceVariableDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.workspaceVariablesService.upsertVariable(
      user.id,
      body,
      workspaceId
    );
  }
}
