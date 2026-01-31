import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CannedResponsesService } from "./canned-responses.service";
import { CreateCannedResponseDto } from "./dto/create-canned-response.dto";
import { UpdateCannedResponseDto } from "./dto/update-canned-response.dto";

@Controller("canned-responses")
@UseGuards(AccessTokenGuard)
export class CannedResponsesController {
  constructor(private readonly cannedResponsesService: CannedResponsesService) {}

  @Get()
  async listResponses(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("isActive") isActive?: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.cannedResponsesService.listResponses(user.id, { search, isActive }, workspaceId);
  }

  @Post()
  async createResponse(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCannedResponseDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.cannedResponsesService.createResponse(user.id, body, workspaceId);
  }

  @Patch(":id")
  async updateResponse(
    @CurrentUser() user: AuthUser,
    @Param("id") responseId: string,
    @Body() body: UpdateCannedResponseDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.cannedResponsesService.updateResponse(user.id, responseId, body, workspaceId);
  }

  @Delete(":id")
  async deleteResponse(
    @CurrentUser() user: AuthUser,
    @Param("id") responseId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.cannedResponsesService.deleteResponse(user.id, responseId, workspaceId);
  }
}
