import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogAction } from "./audit-log.types";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(userId: string, page?: number, perPage?: number, workspaceId?: string) {
    const currentWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    if (!currentWorkspaceId) {
      throw new BadRequestException("Workspace atual não definido.");
    }

    const safePage = Number.isFinite(page) ? Math.max(page as number, 1) : DEFAULT_PAGE;
    const safePerPage = Number.isFinite(perPage)
      ? Math.min(Math.max(perPage as number, 1), MAX_PER_PAGE)
      : DEFAULT_PER_PAGE;
    const skip = (safePage - 1) * safePerPage;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { workspaceId: currentWorkspaceId },
        orderBy: { createdAt: "desc" },
        skip,
        take: safePerPage
      }),
      this.prisma.auditLog.count({ where: { workspaceId: currentWorkspaceId } })
    ]);

    return {
      data: items,
      meta: {
        page: safePage,
        perPage: safePerPage,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safePerPage)
      }
    };
  }

  async record(payload: {
    workspaceId: string;
    userId: string;
    action: AuditLogAction;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    const metadata = payload.metadata ?? undefined;

    return this.prisma.auditLog.create({
      data: {
        workspaceId: payload.workspaceId,
        userId: payload.userId,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      const membership = await this.prisma.workspaceMember.findFirst({
        where: { userId, workspaceId: normalized }
      });

      if (!membership) {
        throw new BadRequestException("Workspace inválido.");
      }

      return normalized;
    }

    return this.getCurrentWorkspaceId(userId);
  }

  async getCurrentWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true }
    });

    return user?.currentWorkspaceId ?? null;
  }
}
