import { Injectable } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";
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
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaces(params: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<PaginatedResponse<WorkspaceOverview>> {
    const page = params.page && params.page > 0 ? params.page : DEFAULT_PAGE;
    const perPage =
      params.perPage && params.perPage > 0 ? params.perPage : DEFAULT_PER_PAGE;
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

    const [messageCounts, automationCounts, subscriptions] =
      await this.prisma.$transaction([
        this.prisma.message.groupBy({
          by: ["workspaceId"],
          where: { workspaceId: { in: workspaceIds } },
          orderBy: { workspaceId: "asc" },
          _count: { _all: true }
        }),
        this.prisma.automationInstance.groupBy({
          by: ["workspaceId"],
          where: { workspaceId: { in: workspaceIds } },
          orderBy: { workspaceId: "asc" },
          _count: { _all: true }
        }),
        this.prisma.subscription.findMany({
          where: { workspaceId: { in: workspaceIds } },
          orderBy: { updatedAt: "desc" },
          distinct: ["workspaceId"]
        })
      ]);

    const messageMap = new Map(
      messageCounts.map((entry) => [
        entry.workspaceId,
        typeof entry._count === "object" && entry._count?._all
          ? entry._count._all
          : 0
      ])
    );
    const automationMap = new Map(
      automationCounts.map((entry) => [
        entry.workspaceId,
        typeof entry._count === "object" && entry._count?._all
          ? entry._count._all
          : 0
      ])
    );
    const subscriptionMap = new Map(
      subscriptions.map((subscription) => [
        subscription.workspaceId,
        subscription
      ])
    );

    const data = workspaces.map((workspace) => {
      const subscription = subscriptionMap.get(workspace.id);
      const status: WorkspaceOverview["status"] =
        (subscription?.status as SubscriptionStatus | undefined) ??
        "NO_SUBSCRIPTION";
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

  async listErrorLogs(params: {
    page?: number;
    perPage?: number;
    workspaceId?: string;
  }): Promise<PaginatedResponse<ErrorLogSummary>> {
    const page = params.page && params.page > 0 ? params.page : DEFAULT_PAGE;
    const perPage =
      params.perPage && params.perPage > 0 ? params.perPage : DEFAULT_PER_PAGE;
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
}
