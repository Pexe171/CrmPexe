import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateQueueDto } from "./dto/create-queue.dto";
import { UpdateQueueDto } from "./dto/update-queue.dto";

@Injectable()
export class QueuesService {
  constructor(private readonly prisma: PrismaService) {}

  async listQueues(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    return this.prisma.queue.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        team: {
          select: { id: true, name: true }
        },
        lastAssignedMember: {
          select: {
            id: true,
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
  }

  async createQueue(userId: string, payload: CreateQueueDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const name = this.normalizeRequiredString(payload.name, "name");
    const channel = this.normalizeRequiredString(payload.channel, "channel");
    const team = await this.prisma.team.findFirst({
      where: { id: payload.teamId, workspaceId: resolvedWorkspaceId }
    });

    if (!team) {
      throw new NotFoundException("Time não encontrado.");
    }

    return this.prisma.queue.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        name,
        channel,
        teamId: team.id,
        isActive: payload.isActive ?? true
      },
      include: {
        team: {
          select: { id: true, name: true }
        }
      }
    });
  }

  async updateQueue(userId: string, queueId: string, payload: UpdateQueueDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, workspaceId: resolvedWorkspaceId }
    });

    if (!queue) {
      throw new NotFoundException("Fila não encontrada.");
    }

    let teamId = queue.teamId;
    if (payload.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: payload.teamId, workspaceId: resolvedWorkspaceId }
      });
      if (!team) {
        throw new NotFoundException("Time não encontrado.");
      }
      teamId = team.id;
    }

    const data: Prisma.QueueUpdateInput = {
      name: payload.name ? this.normalizeRequiredString(payload.name, "name") : undefined,
      channel: payload.channel ? this.normalizeRequiredString(payload.channel, "channel") : undefined,
      teamId,
      isActive: payload.isActive
    };

    return this.prisma.queue.update({
      where: { id: queue.id },
      data,
      include: {
        team: {
          select: { id: true, name: true }
        },
        lastAssignedMember: {
          select: {
            id: true,
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
  }

  async deleteQueue(userId: string, queueId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, workspaceId: resolvedWorkspaceId }
    });

    if (!queue) {
      throw new NotFoundException("Fila não encontrada.");
    }

    await this.prisma.queue.delete({
      where: { id: queue.id }
    });

    return { success: true };
  }

  async assignConversationRoundRobin(params: {
    workspaceId: string;
    channel: string;
    conversationId: string;
  }) {
    return this.prisma.$transaction(
      async (tx) => this.assignConversationRoundRobinTx(tx, params),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  private async assignConversationRoundRobinTx(
    tx: Prisma.TransactionClient,
    params: { workspaceId: string; channel: string; conversationId: string }
  ) {
    const queue = await tx.queue.findFirst({
      where: {
        workspaceId: params.workspaceId,
        channel: params.channel,
        isActive: true
      }
    });

    if (!queue) {
      return null;
    }

    const members = await tx.teamMember.findMany({
      where: { teamId: queue.teamId, isActive: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }]
    });

    if (members.length === 0) {
      return null;
    }

    const currentIndex = queue.lastAssignedMemberId
      ? members.findIndex((member) => member.id === queue.lastAssignedMemberId)
      : -1;

    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % members.length : 0;
    const nextMember = members[nextIndex];

    await tx.queue.update({
      where: { id: queue.id },
      data: { lastAssignedMemberId: nextMember.id }
    });

    const updated = await tx.conversation.updateMany({
      where: {
        id: params.conversationId,
        workspaceId: params.workspaceId,
        assignedToUserId: null
      },
      data: {
        assignedToUserId: nextMember.userId,
        queueId: queue.id
      }
    });

    if (updated.count === 0) {
      return null;
    }

    return {
      assignedToUserId: nextMember.userId,
      queueId: queue.id,
      teamMemberId: nextMember.id
    };
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

  private normalizeRequiredString(value: string | undefined | null, field: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} é obrigatório.`);
    }
    return trimmed;
  }
}
