import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { AddTeamMemberDto } from "./dto/add-team-member.dto";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { UpdateTeamMemberDto } from "./dto/update-team-member.dto";
import { TeamsService } from "./teams.service";

@Controller("teams")
@UseGuards(AccessTokenGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async listTeams(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.teamsService.listTeams(user.id, workspaceId);
  }

  @Post()
  async createTeam(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTeamDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.teamsService.createTeam(user.id, body, workspaceId);
  }

  @Patch(":id")
  async updateTeam(
    @CurrentUser() user: AuthUser,
    @Param("id") teamId: string,
    @Body() body: UpdateTeamDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.teamsService.updateTeam(user.id, teamId, body, workspaceId);
  }

  @Delete(":id")
  async deleteTeam(
    @CurrentUser() user: AuthUser,
    @Param("id") teamId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.teamsService.deleteTeam(user.id, teamId, workspaceId);
  }

  @Post(":id/members")
  async addMember(
    @CurrentUser() user: AuthUser,
    @Param("id") teamId: string,
    @Body() body: AddTeamMemberDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.teamsService.addMember(user.id, teamId, body, workspaceId);
  }

  @Patch(":id/members/:memberId")
  async updateMember(
    @CurrentUser() user: AuthUser,
    @Param("id") teamId: string,
    @Param("memberId") memberId: string,
    @Body() body: UpdateTeamMemberDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.teamsService.updateMember(
      user.id,
      teamId,
      memberId,
      body,
      workspaceId
    );
  }

  @Delete(":id/members/:memberId")
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Param("id") teamId: string,
    @Param("memberId") memberId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.teamsService.removeMember(
      user.id,
      teamId,
      memberId,
      workspaceId
    );
  }
}
