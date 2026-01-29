import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

export type WorkspaceUsageSummary = {
  mensagens: number;
  automacoes: number;
};

export type WorkspaceOverview = {
  id: string;
  name: string;
  status: SubscriptionStatus | "NO_SUBSCRIPTION";
  plano: string;
  uso: WorkspaceUsageSummary;
  createdAt: Date;
  updatedAt: Date;
  updatedAtPlano: Date | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
};

export type ErrorLogSummary = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  action: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
};

@Injectable()
export class SuperAdminService {
  private readonly supportTokenTtlMs = Number(
    process.env.SUPPORT_IMPERSONATION_TTL_MS || 15 * 60 * 1000
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  async listWorkspaces(params: { page?: number; perPage?: number; search?: string })
    : Promise<PaginatedResponse<WorkspaceOverview>> {
    const page = params.page && params.page > 0 ? params.page : DEFAULT_PAGE;
    const perPage = params.perPage && params.perPage > 0 ? params.perPage : DEFAULT_PER_PAGE;
    const skip = (page - 1) * perPage;

    const where: Prisma.WorkspaceWhereInput = params.search
      ? { name: { contains: params.search, mode: "insensitive" } }
      : {};

    const [workspaces, total] = await this.prisma.$transaction([
      this.prisma.workspace.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage
      }),
      this.prisma.workspace.count({ where })
    ]);

    if (workspaces.length === 0) {
      return { data: [], meta: { page, perPage, total } };
    }

    const workspaceIds = workspaces.map((workspace) => workspace.id);

    const [messageCounts, automationCounts, subscriptions] = await this.prisma.$transaction([
      this.prisma.message.groupBy({
        by: ["workspaceId"],
        where: { workspaceId: { in: workspaceIds } },
        _count: { _all: true }
      }),
      this.prisma.automationInstance.groupBy({
        by: ["workspaceId"],
        where: { workspaceId: { in: workspaceIds } },
        _count: { _all: true }
      }),
      this.prisma.subscription.findMany({
        where: { workspaceId: { in: workspaceIds } },
        orderBy: { updatedAt: "desc" },
        distinct: ["workspaceId"]
      })
    ]);

    const messageMap = new Map(
      messageCounts.map((entry) => [entry.workspaceId, entry._count._all])
    );
    const automationMap = new Map(
      automationCounts.map((entry) => [entry.workspaceId, entry._count._all])
    );
    const subscriptionMap = new Map(
      subscriptions.map((subscription) => [subscription.workspaceId, subscription])
    );

    const data = workspaces.map((workspace) => {
      const subscription = subscriptionMap.get(workspace.id);
      const status = subscription?.status ?? "NO_SUBSCRIPTION";
      const plano = subscription?.provider ?? "SEM_PLANO";
      const uso = {
        mensagens: messageMap.get(workspace.id) ?? 0,
        automacoes: automationMap.get(workspace.id) ?? 0
      };

      return {
        id: workspace.id,
        name: workspace.name,
        status,
        plano,
        uso,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        updatedAtPlano: subscription?.updatedAt ?? null
      };
    });

    return {
      data,
      meta: { page, perPage, total }
    };
  }

  async listErrorLogs(params: { page?: number; perPage?: number; workspaceId?: string })
    : Promise<PaginatedResponse<ErrorLogSummary>> {
    const page = params.page && params.page > 0 ? params.page : DEFAULT_PAGE;
    const perPage = params.perPage && params.perPage > 0 ? params.perPage : DEFAULT_PER_PAGE;
    const skip = (page - 1) * perPage;

    const where: Prisma.AiUsageLogWhereInput = {
      AND: [
        { status: "ERROR" },
        params.workspaceId ? { workspaceId: params.workspaceId } : {}
      ]
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.aiUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        select: {
          id: true,
          workspaceId: true,
          action: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          workspace: { select: { name: true } }
        }
      }),
      this.prisma.aiUsageLog.count({ where })
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        workspaceId: log.workspaceId,
        workspaceName: log.workspace?.name ?? "-",
        action: log.action,
        status: log.status,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt
      })),
      meta: { page, perPage, total }
    };
  }

  async listWorkspaceMembers(workspaceId: string) {
    const normalizedWorkspaceId = workspaceId?.trim();
    if (!normalizedWorkspaceId) {
      throw new BadRequestException("Workspace inválido.");
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: normalizedWorkspaceId },
      select: { id: true }
    });

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado.");
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: normalizedWorkspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { name: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return members.map((member) => ({
      id: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role.name
    }));
  }

  async createSupportImpersonationToken(
    adminId: string,
    workspaceId: string,
    userId?: string
  ) {
    const normalizedWorkspaceId = workspaceId?.trim();
    if (!normalizedWorkspaceId) {
      throw new BadRequestException("Workspace inválido.");
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: normalizedWorkspaceId },
      select: { id: true }
    });

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado.");
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: normalizedWorkspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { name: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    if (members.length === 0) {
      throw new BadRequestException("Workspace sem membros ativos.");
    }

    const targetMember = userId
      ? members.find((member) => member.userId === userId)
      : members.find((member) =>
          ["Owner", "Admin", "Administrador"].includes(member.role.name)
        ) ?? members[0];

    if (!targetMember) {
      throw new NotFoundException("Membro não encontrado no workspace.");
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + this.supportTokenTtlMs);

    const created = await this.prisma.supportImpersonationToken.create({
      data: {
        tokenHash,
        createdByAdminId: adminId,
        targetUserId: targetMember.userId,
        workspaceId: normalizedWorkspaceId,
        expiresAt
      }
    });

    await this.auditLogsService.record({
      workspaceId: normalizedWorkspaceId,
      userId: adminId,
      action: "SUPPORT_IMPERSONATION_CREATED",
      entity: "SupportImpersonationToken",
      entityId: created.id,
      metadata: {
        targetUserId: targetMember.userId,
        targetUserEmail: targetMember.user.email,
        targetUserName: targetMember.user.name,
        expiresAt: expiresAt.toISOString()
      }
    });

    return {
      token,
      expiresAt,
      workspaceId: normalizedWorkspaceId,
      targetUser: {
        id: targetMember.userId,
        name: targetMember.user.name,
        email: targetMember.user.email,
        role: targetMember.role.name
      }
    };
  }
}
