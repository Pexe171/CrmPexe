import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async listTasks(
    userId: string,
    filters: {
      status?: TaskStatus;
      dueBefore?: string;
      dueAfter?: string;
      assignedToId?: string;
    },
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const where: Prisma.TaskWhereInput = { workspaceId: resolvedWorkspaceId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.dueBefore || filters.dueAfter) {
      where.dueAt = {};
      if (filters.dueBefore) {
        const dueBefore = this.parseDate(filters.dueBefore, "dueBefore");
        where.dueAt.lte = dueBefore;
      }
      if (filters.dueAfter) {
        const dueAfter = this.parseDate(filters.dueAfter, "dueAfter");
        where.dueAt.gte = dueAfter;
      }
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async createTask(userId: string, payload: CreateTaskDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const title = payload.title?.trim();

    if (!title) {
      throw new BadRequestException("Título da task é obrigatório.");
    }

    const dueAt = payload.dueAt ? this.parseDate(payload.dueAt, "dueAt") : undefined;
    const relatedType = this.normalizeOptionalString(payload.relatedType);
    const relatedId = this.normalizeOptionalString(payload.relatedId);

    if ((relatedType && !relatedId) || (!relatedType && relatedId)) {
      throw new BadRequestException("relatedType e relatedId devem ser enviados juntos.");
    }

    const assignedToId = this.normalizeOptionalString(payload.assignedToId);

    if (assignedToId) {
      await this.ensureAssigneeInWorkspace(resolvedWorkspaceId, assignedToId);
    }

    return this.prisma.task.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        title,
        dueAt,
        status: payload.status ?? TaskStatus.PENDING,
        assignedToId: assignedToId ?? undefined,
        relatedType,
        relatedId
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async updateTask(userId: string, taskId: string, payload: UpdateTaskDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    if (payload.version === undefined) {
      throw new BadRequestException("Versão da task é obrigatória.");
    }

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId: resolvedWorkspaceId }
    });

    if (!task) {
      throw new NotFoundException("Task não encontrada.");
    }

    if (task.version !== payload.version) {
      throw new ConflictException("Task foi atualizada por outro usuário.");
    }

    let title: string | undefined;
    if (payload.title !== undefined) {
      const trimmedTitle = payload.title?.trim();
      if (!trimmedTitle) {
        throw new BadRequestException("Título da task é obrigatório.");
      }
      title = trimmedTitle;
    }

    const dueAt = payload.dueAt !== undefined
      ? payload.dueAt
        ? this.parseDate(payload.dueAt, "dueAt")
        : null
      : undefined;

    const assignedToId = payload.assignedToId !== undefined
      ? this.normalizeOptionalString(payload.assignedToId)
      : undefined;

    if (assignedToId) {
      await this.ensureAssigneeInWorkspace(resolvedWorkspaceId, assignedToId);
    }

    const relatedType = payload.relatedType !== undefined
      ? this.normalizeOptionalString(payload.relatedType)
      : undefined;
    const relatedId = payload.relatedId !== undefined
      ? this.normalizeOptionalString(payload.relatedId)
      : undefined;

    if ((relatedType !== undefined || relatedId !== undefined)) {
      const nextRelatedType = relatedType ?? task.relatedType;
      const nextRelatedId = relatedId ?? task.relatedId;
      if ((nextRelatedType && !nextRelatedId) || (!nextRelatedType && nextRelatedId)) {
        throw new BadRequestException("relatedType e relatedId devem ser enviados juntos.");
      }
    }

    const updated = await this.prisma.task.updateMany({
      where: { id: task.id, workspaceId: resolvedWorkspaceId, version: payload.version },
      data: {
        title,
        dueAt,
        status: payload.status,
        assignedToId: assignedToId === undefined ? undefined : assignedToId,
        relatedType,
        relatedId,
        version: { increment: 1 }
      }
    });

    if (updated.count === 0) {
      throw new ConflictException("Task foi atualizada por outro usuário.");
    }

    const refreshed = await this.prisma.task.findFirst({
      where: { id: task.id, workspaceId: resolvedWorkspaceId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!refreshed) {
      throw new NotFoundException("Task não encontrada.");
    }

    return refreshed;
  }

  async deleteTask(userId: string, taskId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const result = await this.prisma.task.updateMany({
      where: { id: taskId, workspaceId: resolvedWorkspaceId },
      data: { deletedAt: new Date(), version: { increment: 1 } }
    });

    if (result.count === 0) {
      throw new NotFoundException("Task não encontrada.");
    }

    return { success: true };
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

  private async ensureAssigneeInWorkspace(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!membership) {
      throw new BadRequestException("Usuário atribuído não pertence ao workspace.");
    }
  }
}
