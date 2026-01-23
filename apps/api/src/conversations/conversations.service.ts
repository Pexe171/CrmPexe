import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConversationStatus, MessageDirection, NotificationType, Prisma } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { AssignConversationDto } from "./dto/assign-conversation.dto";
import { CreateOutgoingMessageDto } from "./dto/create-outgoing-message.dto";

@Injectable()
export class ConversationsService {
  private readonly slaResponseSeconds = this.resolveSlaResponseSeconds();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

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

    const result = await this.prisma.$transaction(async (tx) => {
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

      const isFirstResponse = conversation.firstResponseTimeSeconds === null ||
        conversation.firstResponseTimeSeconds === undefined;
      const computedFirstResponseTimeSeconds = Math.max(
        0,
        Math.floor((sentAt.getTime() - conversation.createdAt.getTime()) / 1000)
      );
      const firstResponseTimeSeconds = isFirstResponse
        ? computedFirstResponseTimeSeconds
        : conversation.firstResponseTimeSeconds;

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: sentAt,
          firstResponseTimeSeconds: conversation.firstResponseTimeSeconds ?? firstResponseTimeSeconds
        }
      });

      return { message, isFirstResponse, firstResponseTimeSeconds };
    });

    if (result.isFirstResponse && result.firstResponseTimeSeconds > this.slaResponseSeconds) {
      await this.notifySlaBreach(resolvedWorkspaceId, conversation.id, conversation.assignedToUserId);
    }

    return result.message;
  }

  async assignConversation(
    userId: string,
    conversationId: string,
    payload: AssignConversationDto,
    workspaceId?: string
  ) {
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
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversa não encontrada.");
    }

    if (conversation.assignedToUserId) {
      throw new BadRequestException("Conversa já atribuída.");
    }

    const requestedAssignee =
      payload.assignedToUserId === undefined ? userId : payload.assignedToUserId;

    if (requestedAssignee) {
      await this.ensureWorkspaceMembership(requestedAssignee, resolvedWorkspaceId);
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedToUserId: requestedAssignee ?? null
      },
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
        }
      }
    });

    if (updated.assignedToUserId) {
      await this.notificationsService.createNotification({
        workspaceId: resolvedWorkspaceId,
        userId: updated.assignedToUserId,
        conversationId: updated.id,
        type: NotificationType.CONVERSATION_ASSIGNED,
        title: "Conversa atribuída",
        body: updated.contact?.name
          ? `Conversa com ${updated.contact.name} foi atribuída para você.`
          : "Uma conversa foi atribuída para você.",
        data: { conversationId: updated.id }
      });
    }

    return updated;
  }

  async closeConversation(userId: string, conversationId: string, workspaceId?: string) {
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
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversa não encontrada.");
    }

    const closedAt = new Date();
    const resolutionTimeSeconds =
      conversation.resolutionTimeSeconds ??
      Math.max(0, Math.floor((closedAt.getTime() - conversation.createdAt.getTime()) / 1000));

    return this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: ConversationStatus.CLOSED,
        resolutionTimeSeconds: conversation.resolutionTimeSeconds ?? resolutionTimeSeconds
      },
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
        }
      }
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

  private resolveSlaResponseSeconds() {
    const parsed = Number(process.env.SLA_RESPONSE_SECONDS ?? 900);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 900;
    }
    return parsed;
  }

  private async notifySlaBreach(
    workspaceId: string,
    conversationId: string,
    assignedToUserId?: string | null
  ) {
    const title = "SLA estourado";
    const body = "O tempo de primeira resposta ultrapassou o SLA configurado.";

    if (assignedToUserId) {
      await this.notificationsService.createNotification({
        workspaceId,
        userId: assignedToUserId,
        conversationId,
        type: NotificationType.SLA_BREACH,
        title,
        body,
        data: { conversationId }
      });
      return;
    }

    await this.notificationsService.notifyWorkspaceMembers({
      workspaceId,
      conversationId,
      type: NotificationType.SLA_BREACH,
      title,
      body,
      data: { conversationId }
    });
  }
}
