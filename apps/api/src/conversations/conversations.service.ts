import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MessageDirection, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOutgoingMessageDto } from "./dto/create-outgoing-message.dto";

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(userId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    return this.prisma.conversation.findMany({
      where: { workspaceId },
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

  async getConversation(userId: string, conversationId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
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

  async postOutgoingMessage(userId: string, conversationId: string, payload: CreateOutgoingMessageDto) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId }
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
          workspaceId,
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
