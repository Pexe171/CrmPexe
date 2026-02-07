import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface NotificationPayload {
  workspaceId: string;
  userId: string;
  conversationId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Prisma.InputJsonValue;
}

export interface NotificationWorkspacePayload extends Omit<
  NotificationPayload,
  "userId"
> {
  excludeUserIds?: string[];
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(
    userId: string,
    workspaceId?: string,
    unreadOnly?: boolean
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    return this.prisma.notification.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
        userId,
        readAt: unreadOnly ? null : undefined
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async markAsRead(
    userId: string,
    notificationId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, workspaceId: resolvedWorkspaceId, userId }
    });

    if (!notification) {
      throw new NotFoundException("Notificação não encontrada.");
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() }
    });
  }

  async createNotification(payload: NotificationPayload) {
    return this.prisma.notification.create({
      data: {
        workspaceId: payload.workspaceId,
        userId: payload.userId,
        conversationId: payload.conversationId ?? undefined,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? undefined,
        data: payload.data
      }
    });
  }

  async notifyWorkspaceMembers(payload: NotificationWorkspacePayload) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: payload.workspaceId },
      select: { userId: true }
    });

    const userIds = members
      .map((member) => member.userId)
      .filter((userId) => !payload.excludeUserIds?.includes(userId));

    if (userIds.length === 0) {
      return;
    }

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        workspaceId: payload.workspaceId,
        userId,
        conversationId: payload.conversationId ?? undefined,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? undefined,
        data: payload.data
      }))
    });
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
