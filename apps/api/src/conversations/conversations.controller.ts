import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { AssignConversationDto } from "./dto/assign-conversation.dto";
import { CreateOutgoingMessageDto } from "./dto/create-outgoing-message.dto";
import { SendConversationMessageDto } from "./dto/send-conversation-message.dto";
import { ConversationsService } from "./conversations.service";

@Controller("conversations")
@UseGuards(AccessTokenGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async listConversations(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.conversationsService.listConversations(user.id, { page, limit }, workspaceId);
  }

  @Get(":id")
  async getConversation(
    @CurrentUser() user: AuthUser,
    @Param("id") conversationId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.conversationsService.getConversation(user.id, conversationId, workspaceId);
  }

  @Post(":id/messages")
  async postOutgoingMessage(
    @CurrentUser() user: AuthUser,
    @Param("id") conversationId: string,
    @Body() body: CreateOutgoingMessageDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.conversationsService.postOutgoingMessage(user.id, conversationId, body, workspaceId);
  }

  @Post(":id/send")
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param("id") conversationId: string,
    @Body() body: SendConversationMessageDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.conversationsService.sendMessage(user.id, conversationId, body, workspaceId);
  }

  @Patch(":id/assign")
  async assignConversation(
    @CurrentUser() user: AuthUser,
    @Param("id") conversationId: string,
    @Body() body: AssignConversationDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.conversationsService.assignConversation(user.id, conversationId, body, workspaceId);
  }

  @Patch(":id/close")
  async closeConversation(
    @CurrentUser() user: AuthUser,
    @Param("id") conversationId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.conversationsService.closeConversation(user.id, conversationId, workspaceId);
  }
}
