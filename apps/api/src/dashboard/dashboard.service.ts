import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, AutomationInstanceStatus, AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_INTERVAL = "day" as const;
const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_RESPONSAVEIS_LIMIT = 5;
const DEFAULT_TEMPLATES_LIMIT = 5;
const DEFAULT_ERROS_LIMIT = 5;

type Interval = "day" | "week" | "month";

type DateRange = {
  start: Date;
  end: Date;
};

type SalesDashboardParams = {
  startDate?: string;
  endDate?: string;
  interval?: string;
  responsaveisLimit?: number;
  produtividadeLimit?: number;
};

type AutomationDashboardParams = {
  startDate?: string;
  endDate?: string;
  interval?: string;
  templatesLimit?: number;
  errosLimit?: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesDashboard(
    userId: string,
    workspaceId?: string,
    params?: SalesDashboardParams
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const { start, end } = this.resolveDateRange(
      params?.startDate,
      params?.endDate
    );
    const interval = this.resolveInterval(params?.interval);
    const responsaveisLimit =
      params?.responsaveisLimit ?? DEFAULT_RESPONSAVEIS_LIMIT;
    const produtividadeLimit =
      params?.produtividadeLimit ?? DEFAULT_RESPONSAVEIS_LIMIT;

    const [
      dealsByStage,
      deals,
      dealAuditLogs,
      conversations,
      outboundMessages
    ] = await Promise.all([
      this.prisma.deal.groupBy({
        by: ["stage"],
        where: {
          workspaceId: resolvedWorkspaceId,
          createdAt: { gte: start, lte: end }
        },
        _count: { _all: true },
        _sum: { amount: true }
      }),
      this.prisma.deal.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          createdAt: { gte: start, lte: end }
        },
        select: { id: true, stage: true, amount: true, createdAt: true }
      }),
      this.prisma.auditLog.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          entity: "Deal",
          action: { in: [AuditAction.CREATE, AuditAction.UPDATE] },
          createdAt: { gte: start, lte: end }
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          entityId: true,
          metadata: true,
          action: true,
          createdAt: true
        }
      }),
      this.prisma.conversation.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          createdAt: { gte: start, lte: end }
        },
        select: {
          id: true,
          status: true,
          assignedToUserId: true,
          firstResponseTimeSeconds: true,
          createdAt: true
        }
      }),
      this.prisma.message.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          direction: "OUT",
          sentAt: { gte: start, lte: end }
        },
        select: {
          id: true,
          conversationId: true,
          sentAt: true
        }
      })
    ]);

    const dealsPorEtapa = dealsByStage.map((item) => ({
      etapa: this.normalizeStage(item.stage),
      quantidade: item._count._all,
      valorTotal: item._sum.amount ?? 0
    }));

    const valorPorPeriodo = this.groupByPeriodo(deals, interval, (deal) => ({
      total: deal.amount ?? 0,
      quantidade: 1
    }));

    const conversaoEntreEtapas = this.buildStageConversions(dealAuditLogs);

    const rankingResponsaveis = await this.buildResponsaveisRanking(
      resolvedWorkspaceId,
      dealAuditLogs,
      responsaveisLimit
    );

    const slaPrimeiraResposta = this.buildSlaPrimeiraResposta(conversations);
    const produtividadeUsuarios = await this.buildProdutividadeUsuarios(
      resolvedWorkspaceId,
      conversations,
      outboundMessages,
      produtividadeLimit
    );

    return {
      periodo: {
        inicio: start.toISOString(),
        fim: end.toISOString(),
        intervalo: interval
      },
      dealsPorEtapa,
      conversaoEntreEtapas,
      slaPrimeiraResposta,
      valorPorPeriodo,
      produtividadeUsuarios,
      rankingResponsaveis
    };
  }

  async getAutomationDashboard(
    userId: string,
    workspaceId?: string,
    params?: AutomationDashboardParams
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const { start, end } = this.resolveDateRange(
      params?.startDate,
      params?.endDate
    );
    const interval = this.resolveInterval(params?.interval);
    const templatesLimit = params?.templatesLimit ?? DEFAULT_TEMPLATES_LIMIT;
    const errosLimit = params?.errosLimit ?? DEFAULT_ERROS_LIMIT;

    const instances = await this.prisma.automationInstance.findMany({
      where: {
        workspaceId: resolvedWorkspaceId,
        createdAt: { gte: start, lte: end }
      },
      select: {
        id: true,
        templateId: true,
        status: true,
        createdAt: true
      }
    });

    const execucoesPorPeriodo = this.groupByPeriodo(
      instances,
      interval,
      () => ({
        total: 1
      })
    ).map((item) => ({
      periodo: item.periodo,
      quantidade: item.total
    }));

    const totalExecucoes = instances.length;
    const falhas = instances.filter(
      (instance) => instance.status === AutomationInstanceStatus.FAILED
    ).length;
    const taxaFalha = totalExecucoes > 0 ? (falhas / totalExecucoes) * 100 : 0;

    const [templatesMaisUsados, errosTop] = await Promise.all([
      this.buildTemplateRanking(instances, templatesLimit),
      this.buildFailedTemplatesRanking(instances, errosLimit)
    ]);

    return {
      periodo: {
        inicio: start.toISOString(),
        fim: end.toISOString(),
        intervalo: interval
      },
      execucoesPorPeriodo,
      taxaFalha: {
        total: totalExecucoes,
        falhas,
        percentual: taxaFalha
      },
      templatesMaisUsados,
      errosTop
    };
  }

  private buildSlaPrimeiraResposta(
    conversations: Array<{ firstResponseTimeSeconds: number | null }>
  ) {
    const responded = conversations.filter(
      (conversation) =>
        conversation.firstResponseTimeSeconds !== null &&
        conversation.firstResponseTimeSeconds !== undefined
    );

    const total = responded.reduce(
      (acc, conversation) => acc + (conversation.firstResponseTimeSeconds ?? 0),
      0
    );

    return {
      conversasRespondidas: responded.length,
      tempoMedioSegundos: responded.length > 0 ? total / responded.length : 0
    };
  }

  private async buildProdutividadeUsuarios(
    workspaceId: string,
    conversations: Array<{
      id: string;
      status: string;
      assignedToUserId: string | null;
    }>,
    outboundMessages: Array<{ conversationId: string }>,
    limit: number
  ) {
    const assigned = conversations.filter(
      (conversation) => conversation.assignedToUserId
    );
    if (!assigned.length) {
      return [];
    }

    const messagesByConversation = new Map<string, number>();
    outboundMessages.forEach((message) => {
      messagesByConversation.set(
        message.conversationId,
        (messagesByConversation.get(message.conversationId) ?? 0) + 1
      );
    });

    const byUser = new Map<
      string,
      {
        conversas: number;
        conversasFechadas: number;
        mensagensEnviadas: number;
      }
    >();

    assigned.forEach((conversation) => {
      const userId = conversation.assignedToUserId as string;
      const current = byUser.get(userId) ?? {
        conversas: 0,
        conversasFechadas: 0,
        mensagensEnviadas: 0
      };

      byUser.set(userId, {
        conversas: current.conversas + 1,
        conversasFechadas:
          current.conversasFechadas +
          (conversation.status === "CLOSED" ? 1 : 0),
        mensagensEnviadas:
          current.mensagensEnviadas +
          (messagesByConversation.get(conversation.id) ?? 0)
      });
    });

    const userIds = Array.from(byUser.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });
    const userById = new Map(users.map((user) => [user.id, user]));

    return Array.from(byUser.entries())
      .map(([usuarioId, metrics]) => {
        const user = userById.get(usuarioId);
        return {
          usuarioId,
          nome: user?.name ?? "Usuário removido",
          email: user?.email ?? null,
          conversas: metrics.conversas,
          conversasFechadas: metrics.conversasFechadas,
          mensagensEnviadas: metrics.mensagensEnviadas,
          taxaFechamento:
            metrics.conversas > 0
              ? (metrics.conversasFechadas / metrics.conversas) * 100
              : 0
        };
      })
      .sort(
        (a, b) =>
          b.conversasFechadas - a.conversasFechadas ||
          b.mensagensEnviadas - a.mensagensEnviadas
      )
      .slice(0, limit);
  }

  private resolveInterval(interval?: string): Interval {
    if (!interval) return DEFAULT_INTERVAL;
    const normalized = interval.trim().toLowerCase();
    if (
      normalized === "day" ||
      normalized === "week" ||
      normalized === "month"
    ) {
      return normalized;
    }
    throw new BadRequestException(
      "Intervalo inválido. Use day, week ou month."
    );
  }

  private resolveDateRange(startDate?: string, endDate?: string): DateRange {
    const end = endDate ? new Date(endDate) : new Date();
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException("Data final inválida.");
    }

    const start = startDate ? new Date(startDate) : new Date(end.getTime());
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("Data inicial inválida.");
    }

    if (!startDate) {
      start.setDate(start.getDate() - DEFAULT_RANGE_DAYS);
    }

    if (start > end) {
      throw new BadRequestException(
        "A data inicial não pode ser maior que a data final."
      );
    }

    return { start, end };
  }

  private groupByPeriodo<T>(
    items: T[],
    interval: Interval,
    pickValues: (item: T) => { total: number; quantidade?: number }
  ) {
    const aggregated = new Map<string, { total: number; quantidade: number }>();

    items.forEach((item) => {
      const createdAt = (item as { createdAt: Date }).createdAt;
      const periodo = this.formatPeriodo(createdAt, interval);
      const values = pickValues(item);
      const current = aggregated.get(periodo) ?? { total: 0, quantidade: 0 };
      aggregated.set(periodo, {
        total: current.total + values.total,
        quantidade: current.quantidade + (values.quantidade ?? 0)
      });
    });

    return Array.from(aggregated.entries())
      .map(([periodo, values]) => ({ periodo, ...values }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }

  private formatPeriodo(date: Date, interval: Interval) {
    const utcDate = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );

    if (interval === "day") {
      return utcDate.toISOString().slice(0, 10);
    }

    if (interval === "month") {
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    }

    const dayOfWeek = utcDate.getUTCDay();
    const diff = (dayOfWeek + 6) % 7;
    const monday = new Date(utcDate);
    monday.setUTCDate(monday.getUTCDate() - diff);
    return monday.toISOString().slice(0, 10);
  }

  private buildStageConversions(
    logs: Array<{
      entityId: string;
      metadata: Prisma.JsonValue | null;
      createdAt: Date;
    }>
  ) {
    const grouped = new Map<
      string,
      Array<{ stage: string; createdAt: Date }>
    >();

    logs.forEach((log) => {
      const stage = this.extractStage(log.metadata);
      if (stage === null) {
        return;
      }
      const current = grouped.get(log.entityId) ?? [];
      current.push({ stage, createdAt: log.createdAt });
      grouped.set(log.entityId, current);
    });

    const transitions = new Map<string, number>();
    const totalsByOrigin = new Map<string, number>();

    grouped.forEach((entries) => {
      const sorted = entries.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      let previousStage = "Entrada";
      sorted.forEach((entry) => {
        const origin = previousStage;
        const destination = entry.stage;
        if (origin !== destination) {
          const key = `${origin}::${destination}`;
          transitions.set(key, (transitions.get(key) ?? 0) + 1);
          totalsByOrigin.set(origin, (totalsByOrigin.get(origin) ?? 0) + 1);
        }
        previousStage = entry.stage;
      });
    });

    return Array.from(transitions.entries())
      .map(([key, quantidade]) => {
        const [etapaOrigem, etapaDestino] = key.split("::");
        const totalOrigem = totalsByOrigin.get(etapaOrigem) ?? 0;
        const taxaConversao =
          totalOrigem > 0 ? (quantidade / totalOrigem) * 100 : 0;
        return {
          etapaOrigem,
          etapaDestino,
          quantidade,
          taxaConversao
        };
      })
      .sort((a, b) => b.quantidade - a.quantidade);
  }

  private async buildResponsaveisRanking(
    workspaceId: string,
    logs: Array<{
      action: AuditAction;
      entityId: string;
      userId: string;
    }>,
    limit: number
  ) {
    const creates = logs.filter((log) => log.action === AuditAction.CREATE);
    if (creates.length === 0) {
      return [];
    }

    const dealIds = Array.from(new Set(creates.map((log) => log.entityId)));
    const [deals, users] = await Promise.all([
      this.prisma.deal.findMany({
        where: { id: { in: dealIds }, workspaceId },
        select: { id: true, amount: true }
      }),
      this.prisma.user.findMany({
        where: {
          id: { in: Array.from(new Set(creates.map((log) => log.userId))) }
        },
        select: { id: true, name: true, email: true }
      })
    ]);

    const dealAmountById = new Map(
      deals.map((deal) => [deal.id, deal.amount ?? 0])
    );
    const userById = new Map(users.map((user) => [user.id, user]));

    const aggregated = new Map<
      string,
      { quantidade: number; valorTotal: number }
    >();

    creates.forEach((log) => {
      const current = aggregated.get(log.userId) ?? {
        quantidade: 0,
        valorTotal: 0
      };
      aggregated.set(log.userId, {
        quantidade: current.quantidade + 1,
        valorTotal: current.valorTotal + (dealAmountById.get(log.entityId) ?? 0)
      });
    });

    return Array.from(aggregated.entries())
      .map(([userId, values]) => {
        const user = userById.get(userId);
        return {
          usuarioId: userId,
          nome: user?.name ?? "Usuário removido",
          email: user?.email ?? null,
          quantidade: values.quantidade,
          valorTotal: values.valorTotal
        };
      })
      .sort(
        (a, b) => b.valorTotal - a.valorTotal || b.quantidade - a.quantidade
      )
      .slice(0, limit);
  }

  private async buildTemplateRanking(
    instances: Array<{ templateId: string; createdAt: Date }>,
    limit: number
  ) {
    const counts = new Map<string, number>();
    instances.forEach((instance) => {
      counts.set(
        instance.templateId,
        (counts.get(instance.templateId) ?? 0) + 1
      );
    });

    const items = await this.attachTemplateNames(counts);

    return items.sort((a, b) => b.quantidade - a.quantidade).slice(0, limit);
  }

  private async buildFailedTemplatesRanking(
    instances: Array<{ templateId: string; status: AutomationInstanceStatus }>,
    limit: number
  ) {
    const failed = instances.filter(
      (instance) => instance.status === AutomationInstanceStatus.FAILED
    );
    const totalFalhas = failed.length;
    const counts = new Map<string, number>();

    failed.forEach((instance) => {
      counts.set(
        instance.templateId,
        (counts.get(instance.templateId) ?? 0) + 1
      );
    });

    const items = await this.attachTemplateNames(counts);

    return items
      .map((item) => ({
        ...item,
        percentual: totalFalhas > 0 ? (item.quantidade / totalFalhas) * 100 : 0
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, limit);
  }

  private async attachTemplateNames(counts: Map<string, number>) {
    const templateIds = Array.from(counts.keys());
    if (templateIds.length === 0) {
      return [] as Array<{
        templateId: string;
        nome: string;
        quantidade: number;
      }>;
    }

    const templates = await this.prisma.automationTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true }
    });

    const nameById = new Map(
      templates.map((template) => [template.id, template.name])
    );

    return templateIds.map((templateId) => ({
      templateId,
      nome: nameById.get(templateId) ?? "Template removido",
      quantidade: counts.get(templateId) ?? 0
    }));
  }

  private normalizeStage(stage?: string | null) {
    const trimmed = stage?.trim();
    return trimmed ? trimmed : "Sem etapa";
  }

  private extractStage(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== "object") {
      return null;
    }
    const stageValue = (metadata as { stage?: unknown }).stage;
    if (stageValue === null) {
      return this.normalizeStage(null);
    }
    if (typeof stageValue === "string") {
      return this.normalizeStage(stageValue);
    }
    return null;
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true }
    });

    if (!user?.currentWorkspaceId) {
      throw new BadRequestException("Workspace atual não definido.");
    }

    await this.ensureWorkspaceMembership(userId, user.currentWorkspaceId);
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
