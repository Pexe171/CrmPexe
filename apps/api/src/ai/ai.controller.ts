import { BadRequestException, Controller, Headers, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { MessageDirection } from "@prisma/client";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "./ai.service";
import { AiConversationMessage } from "./ai.types";

@Controller("ai")
@UseGuards(AccessTokenGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService
  ) {}

  @Post("conversations/:id/summary")
  async summarizeConversation(
    @CurrentUser() user: AuthUser,
    @Param("id") conversationId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(user.id, workspaceId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId: resolvedWorkspaceId },
      include: {
        messages: {
          orderBy: { sentAt: "asc" }
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversa não encontrada.");
    }

    const messages: AiConversationMessage[] = conversation.messages.map((message) => ({
      role: this.mapRole(message.direction),
      content: message.text,
      sentAt: message.sentAt
    }));

    const summaryResult = await this.aiService.summarizeConversation(resolvedWorkspaceId, {
      conversationId,
      messages,
      locale: "pt-BR"
    });

    const summary = await this.prisma.conversationSummary.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        conversationId,
        text: summaryResult.summary,
        bullets: summaryResult.highlights ?? []
      }
    });

    return {
      id: summary.id,
      conversationId: summary.conversationId,
      text: summary.text,
      bullets: summary.bullets,
      createdAt: summary.createdAt
    };
  }

  private mapRole(direction: MessageDirection): AiConversationMessage["role"] {
    if (direction === MessageDirection.IN) {
      return "user";
    }
    if (direction === MessageDirection.OUT) {
      return "agent";
    }
    return "system";
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }
    const currentWorkspaceId = await this.getCurrentWorkspaceId(userId);
    await this.ensureWorkspaceMembership(userId, currentWorkspaceId);
    return currentWorkspaceId;
  }

  private async getCurrentWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true }
    });

    if (!user?.currentWorkspaceId) {
      throw new BadRequestException("Workspace atual não definido.");
    }

    return user.currentWorkspaceId;
  }

  private async ensureWorkspaceMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    if (!membership) {
      throw new BadRequestException("Workspace inválido.");
    }
  }
}
