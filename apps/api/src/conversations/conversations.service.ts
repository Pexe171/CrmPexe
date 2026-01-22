import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MessageDirection, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOutgoingMessageDto } from "./dto/create-outgoing-message.dto";

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    return this.prisma.conversation.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });
  }

  async getConversation(userId: string, conversationId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId: resolvedWorkspaceId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        messages: {
          orderBy: { sentAt: "asc" }
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversa não encontrada.");
    }

    return conversation;
  }

  async postOutgoingMessage(
    userId: string,
    conversationId: string,
    payload: CreateOutgoingMessageDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId: resolvedWorkspaceId }
    });

    if (!conversation) {
      throw new NotFoundException("Conversa não encontrada.");
    }

    const text = payload.text?.trim();
    if (!text) {
      throw new BadRequestException("Texto da mensagem é obrigatório.");
    }

    const providerMessageId = this.normalizeOptionalString(payload.providerMessageId);
    const sentAt = payload.sentAt ? this.parseDate(payload.sentAt, "sentAt") : new Date();
    const meta = payload.meta ?? undefined;

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          workspaceId: resolvedWorkspaceId,
          conversationId: conversation.id,
          direction: MessageDirection.OUT,
          text,
          providerMessageId: providerMessageId ?? undefined,
          sentAt,
          meta: meta as Prisma.InputJsonValue | undefined
        }
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: sentAt
        }
      });

      return message;
    });
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }
    return this.getCurrentWorkspaceId(userId);
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

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} inválido.`);
    }
    return date;
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
