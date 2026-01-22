import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateOutgoingMessageDto } from "./dto/create-outgoing-message.dto";
import { ConversationsService } from "./conversations.service";

@Controller("conversations")
@UseGuards(AccessTokenGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async listConversations(@CurrentUser() user: AuthUser) {
    return this.conversationsService.listConversations(user.id);
  }

  @Get(":id")
  async getConversation(@CurrentUser() user: AuthUser, @Param("id") conversationId: string) {
    return this.conversationsService.getConversation(user.id, conversationId);
  }

  @Post(":id/messages")
  async postOutgoingMessage(
    @CurrentUser() user: AuthUser,
    @Param("id") conversationId: string,
    @Body() body: CreateOutgoingMessageDto
  ) {
    return this.conversationsService.postOutgoingMessage(user.id, conversationId, body);
  }
}
