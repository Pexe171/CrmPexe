import { Injectable } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
const DEFAULT_PLAN_NAME = "Plano Profissional";

type Pagination = {
  page?: number;
  perPage?: number;
};

type ErrorLog = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  origem: "AI" | "AUTOMACAO";
  acao: string;
  mensagemErro: string | null;
  criadoEm: string;
};

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaces({ page, perPage }: Pagination) {
    const { safePage, safePerPage, skip } = this.getPagination(page, perPage);

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: safePerPage,
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      this.prisma.workspace.count()
    ]);

    const workspaceIds = workspaces.map((workspace) => workspace.id);
    if (workspaceIds.length === 0) {
      return this.buildPaginatedResponse([], safePage, safePerPage, total);
    }

    const [subscriptions, messageCounts, automationCounts] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { workspaceId: { in: workspaceIds } },
        orderBy: { updatedAt: "desc" },
        select: {
          workspaceId: true,
          status: true,
          provider: true,
          updatedAt: true
        }
      }),
      this.prisma.message.groupBy({
        by: ["workspaceId"],
        where: { workspaceId: { in: workspaceIds } },
        _count: { _all: true }
      }),
      this.prisma.automationInstance.groupBy({
        by: ["workspaceId"],
        where: { workspaceId: { in: workspaceIds } },
        _count: { _all: true }
      })
    ]);

    const subscriptionMap = new Map<
      string,
      { status: SubscriptionStatus; provider: string; updatedAt: Date }
    >();
    subscriptions.forEach((subscription) => {
      if (!subscription.workspaceId) {
        return;
      }
      if (!subscriptionMap.has(subscription.workspaceId)) {
        subscriptionMap.set(subscription.workspaceId, {
          status: subscription.status,
          provider: subscription.provider,
          updatedAt: subscription.updatedAt
        });
      }
    });

    const messageCountMap = new Map<string, number>(
      messageCounts.map((item) => [item.workspaceId, item._count._all])
    );
    const automationCountMap = new Map<string, number>(
      automationCounts.map((item) => [item.workspaceId, item._count._all])
    );

    const data = workspaces.map((workspace) => {
      const subscription = subscriptionMap.get(workspace.id);
      return {
        id: workspace.id,
        nome: workspace.name,
        criadoEm: workspace.createdAt.toISOString(),
        atualizadoEm: workspace.updatedAt.toISOString(),
        status: subscription?.status ?? "NO_SUBSCRIPTION",
        plano: DEFAULT_PLAN_NAME,
        provedorPlano: subscription?.provider ?? null,
        uso: {
          mensagens: messageCountMap.get(workspace.id) ?? 0,
          automacoes: automationCountMap.get(workspace.id) ?? 0
        },
        ultimaAtualizacaoPlano: subscription?.updatedAt.toISOString() ?? null
      };
    });

    return this.buildPaginatedResponse(data, safePage, safePerPage, total);
  }

  async listErrorLogs(workspaceId?: string, pagination?: Pagination) {
    const { safePage, safePerPage, skip } = this.getPagination(
      pagination?.page,
      pagination?.perPage
    );
    const workspaceFilter = workspaceId?.trim() ? { workspaceId } : undefined;

    const [aiUsageLogs, automationFailures] = await Promise.all([
      this.prisma.aiUsageLog.findMany({
        where: {
          status: "ERROR",
          ...(workspaceFilter ?? {})
        },
        orderBy: { createdAt: "desc" },
        include: {
          workspace: {
            select: { name: true }
          }
        }
      }),
      this.prisma.automationInstance.findMany({
        where: {
          status: "FAILED",
          ...(workspaceFilter ?? {})
        },
        orderBy: { createdAt: "desc" },
        include: {
          workspace: {
            select: { name: true }
          },
          template: {
            select: { name: true }
          }
        }
      })
    ]);

    const logs: ErrorLog[] = [
      ...aiUsageLogs.map((log) => ({
        id: log.id,
        workspaceId: log.workspaceId,
        workspaceName: log.workspace.name,
        origem: "AI",
        acao: log.action,
        mensagemErro: log.errorMessage ?? "Erro não informado.",
        criadoEm: log.createdAt.toISOString()
      })),
      ...automationFailures.map((instance) => ({
        id: instance.id,
        workspaceId: instance.workspaceId,
        workspaceName: instance.workspace.name,
        origem: "AUTOMACAO",
        acao: instance.template.name,
        mensagemErro: "Falha na automação sem mensagem detalhada.",
        criadoEm: instance.createdAt.toISOString()
      }))
    ].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

    const total = logs.length;
    const paginated = logs.slice(skip, skip + safePerPage);

    return this.buildPaginatedResponse(paginated, safePage, safePerPage, total);
  }

  private getPagination(page?: number, perPage?: number) {
    const safePage = Number.isFinite(page) ? Math.max(page as number, 1) : DEFAULT_PAGE;
    const safePerPage = Number.isFinite(perPage)
      ? Math.min(Math.max(perPage as number, 1), MAX_PER_PAGE)
      : DEFAULT_PER_PAGE;
    const skip = (safePage - 1) * safePerPage;

    return { safePage, safePerPage, skip };
  }

  private buildPaginatedResponse<T>(
    data: T[],
    page: number,
    perPage: number,
    total: number
  ) {
    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / perPage)
      }
    };
  }
}
