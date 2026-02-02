import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  AutomationAccessStatus,
  AutomationInstanceStatus,
  MarketplaceTemplateStatus,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type MarketplaceCategory = {
  id: string;
  name: string;
  description: string;
  agentsCount: number;
  highlights: string[];
};

export type MarketplaceCategoryInput = {
  id?: string;
  name: string;
  description: string;
  highlights: string[];
};

export type MarketplaceAgent = {
  id: string;
  name: string;
  headline: string;
  description: string;
  categoryId: string;
  tags: string[];
  capabilities: string[];
  requirements: string[];
  templateId: string;
  rating: number;
  installs: number;
  responseSlaSeconds: number;
  priceLabel?: string;
  status: MarketplaceTemplateStatus;
  pingUrl?: string;
  configJson?: Prisma.JsonValue | null;
};

export type MarketplaceAgentInput = {
  name: string;
  headline?: string;
  description: string;
  categoryId?: string;
  tags?: string[];
  capabilities?: string[];
  requirements?: string[];
  templateId?: string;
  rating?: number;
  installs?: number;
  responseSlaSeconds?: number;
  priceLabel?: string;
  status?: MarketplaceTemplateStatus;
  pingUrl?: string;
  configJson?: Prisma.JsonValue;
  version?: string;
  changelog?: string;
  definitionJson?: Record<string, unknown>;
  requiredIntegrations?: string[];
};

export type MarketplaceSummary = {
  headline: string;
  activeAgents: number;
  automationsAvailable: number;
  averageNps: number;
  satisfactionRate: number;
  lastUpdatedAt: string;
};

type StoredCategory = Omit<MarketplaceCategory, "agentsCount">;

export type MarketplaceInterest = {
  id: string;
  templateId: string;
  workspaceId: string;
  requestedByUserId: string;
  status: AutomationAccessStatus;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    name: string;
    headline: string | null;
    category: string;
  };
  workspace: {
    id: string;
    name: string;
  };
  requestedByUser: {
    id: string;
    name: string;
    email: string;
  };
};

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<MarketplaceSummary> {
    const [activeAgents, totalTemplates, lastTemplate] = await Promise.all([
      this.prisma.automationTemplate.count({
        where: { status: MarketplaceTemplateStatus.APPROVED }
      }),
      this.prisma.automationTemplate.count(),
      this.prisma.automationTemplate.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      })
    ]);

    return {
      headline: "Agentes personalizados configurados pelo time CrmPexe.",
      activeAgents,
      automationsAvailable: totalTemplates,
      averageNps: 0,
      satisfactionRate: 0,
      lastUpdatedAt: lastTemplate?.updatedAt.toISOString() ?? new Date().toISOString()
    };
  }

  async getCategories(): Promise<MarketplaceCategory[]> {
    const [categories, agentsCount] = await Promise.all([
      this.prisma.marketplaceCategory.findMany({ orderBy: { name: "asc" } }),
      this.prisma.automationTemplate.groupBy({
        by: ["category"],
        _count: { _all: true }
      })
    ]);

    const countsMap = new Map(
      agentsCount.map((entry) => [entry.category, entry._count._all])
    );

    return categories.map((category) => ({
      ...category,
      agentsCount: countsMap.get(category.id) ?? 0
    }));
  }

  async createCategory(input: MarketplaceCategoryInput): Promise<MarketplaceCategory> {
    const newCategory: StoredCategory = {
      id: input.id?.trim() || randomUUID(),
      name: input.name.trim(),
      description: input.description.trim(),
      highlights: input.highlights ?? []
    };

    const created = await this.prisma.marketplaceCategory.create({
      data: newCategory
    });

    return {
      ...created,
      agentsCount: 0
    };
  }

  async updateCategory(
    id: string,
    input: Partial<MarketplaceCategoryInput>
  ): Promise<MarketplaceCategory | null> {
    const existing = await this.prisma.marketplaceCategory.findUnique({
      where: { id }
    });
    if (!existing) return null;

    const updated = await this.prisma.marketplaceCategory.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        description: input.description?.trim(),
        highlights: input.highlights
      }
    });

    const agentsCount = await this.prisma.automationTemplate.count({
      where: { category: updated.id }
    });

    return {
      ...updated,
      agentsCount
    };
  }

  async removeCategory(id: string): Promise<boolean> {
    const existing = await this.prisma.marketplaceCategory.findUnique({
      where: { id }
    });
    if (!existing) return false;

    await this.prisma.marketplaceCategory.delete({ where: { id } });
    return true;
  }

  async getAgents(params?: {
    category?: string;
    search?: string;
  }): Promise<MarketplaceAgent[]> {
    const category = params?.category?.trim();
    const search = params?.search?.trim().toLowerCase();

    const where: Prisma.AutomationTemplateWhereInput = {
      ...(category ? { category } : null),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { headline: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } }
            ]
          }
        : null)
    };

    const templates = await this.prisma.automationTemplate.findMany({
      where,
      include: { _count: { select: { instances: true } } },
      orderBy: { updatedAt: "desc" }
    });

    return templates.map((template) =>
      this.mapTemplateToAgent(template, template._count.instances)
    );
  }

  async createAgent(
    adminId: string,
    input: MarketplaceAgentInput
  ): Promise<MarketplaceAgent> {
    const name = input.name.trim();
    const description = input.description.trim();
    const version = input.version?.trim() || "1.0.0";
    const category = input.categoryId?.trim() || "personalizado";
    const definitionJson = input.definitionJson ?? {};
    const requiredIntegrations = input.requiredIntegrations ?? [];

    if (!name || !description) {
      throw new BadRequestException("Nome e descrição são obrigatórios.");
    }

    return this.prisma.$transaction(async (transaction) => {
      const template = await transaction.automationTemplate.create({
        data: {
          name,
          headline: input.headline?.trim() || "Agente configurado pelo time CrmPexe.",
          description,
          version,
          changelog: input.changelog?.trim(),
          category,
          definitionJson: definitionJson as Prisma.InputJsonValue,
          requiredIntegrations,
          tags: input.tags ?? [],
          capabilities: input.capabilities ?? [],
          requirements: input.requirements ?? [],
          rating: Number.isFinite(input.rating) ? input.rating : 0,
          responseSlaSeconds: Number.isFinite(input.responseSlaSeconds)
            ? input.responseSlaSeconds
            : 0,
          priceLabel: input.priceLabel?.trim(),
          status: input.status ?? MarketplaceTemplateStatus.PENDING,
          pingUrl: input.pingUrl?.trim(),
          configJson: input.configJson ?? undefined,
          createdByAdminId: adminId
        }
      });

      const versionEntry = await transaction.automationTemplateVersion.create({
        data: {
          templateId: template.id,
          version,
          changelog: input.changelog?.trim(),
          definitionJson: definitionJson as Prisma.InputJsonValue,
          requiredIntegrations,
          createdByAdminId: adminId
        }
      });

      const updated = await transaction.automationTemplate.update({
        where: { id: template.id },
        data: { currentVersionId: versionEntry.id }
      });

      return this.mapTemplateToAgent(updated, 0);
    });
  }

  async updateAgent(
    id: string,
    input: Partial<MarketplaceAgentInput>
  ): Promise<MarketplaceAgent | null> {
    const existing = await this.prisma.automationTemplate.findUnique({
      where: { id }
    });
    if (!existing) return null;

    const updated = await this.prisma.automationTemplate.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        headline: input.headline?.trim(),
        description: input.description?.trim(),
        category: input.categoryId?.trim(),
        tags: input.tags,
        capabilities: input.capabilities,
        requirements: input.requirements,
        rating: Number.isFinite(input.rating) ? input.rating : undefined,
        responseSlaSeconds: Number.isFinite(input.responseSlaSeconds)
          ? input.responseSlaSeconds
          : undefined,
        priceLabel: input.priceLabel?.trim(),
        status: input.status,
        pingUrl: input.pingUrl?.trim(),
        configJson: input.configJson
      }
    });

    const instancesCount = await this.prisma.automationInstance.count({
      where: { templateId: updated.id }
    });

    return this.mapTemplateToAgent(updated, instancesCount);
  }

  async removeAgent(id: string): Promise<boolean> {
    const existing = await this.prisma.automationTemplate.findUnique({
      where: { id }
    });
    if (!existing) return false;

    await this.prisma.automationTemplate.delete({ where: { id } });
    return true;
  }

  async installAgent(userId: string, agentId: string, workspaceId?: string) {
    const resolvedWorkspaceId = workspaceId?.trim();
    if (!resolvedWorkspaceId) {
      throw new BadRequestException("Workspace não informado para a instalação.");
    }

    const agent = await this.prisma.automationTemplate.findUnique({
      where: { id: agentId }
    });
    if (!agent) {
      throw new NotFoundException("Agente não encontrado no marketplace.");
    }

    return this.prisma.automationInstance.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        templateId: agent.id,
        status: AutomationInstanceStatus.PENDING_CONFIG,
        configJson: {},
        createdByUserId: userId
      }
    });
  }

  async requestInterest(
    userId: string,
    agentId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = workspaceId?.trim();
    if (!resolvedWorkspaceId) {
      throw new BadRequestException("Workspace não informado.");
    }

    const template = await this.prisma.automationTemplate.findUnique({
      where: { id: agentId }
    });
    if (!template) {
      throw new NotFoundException("Agente não encontrado no marketplace.");
    }

    const [interest, accessRequest] = await this.prisma.$transaction([
      this.prisma.marketplaceInterest.upsert({
        where: {
          workspaceId_templateId_requestedByUserId: {
            workspaceId: resolvedWorkspaceId,
            templateId: agentId,
            requestedByUserId: userId
          }
        },
        update: {
          status: AutomationAccessStatus.PENDING
        },
        create: {
          workspaceId: resolvedWorkspaceId,
          templateId: agentId,
          requestedByUserId: userId,
          status: AutomationAccessStatus.PENDING
        }
      }),
      this.prisma.automationAccessRequest.upsert({
        where: {
          workspaceId_templateId: {
            workspaceId: resolvedWorkspaceId,
            templateId: agentId
          }
        },
        update: {
          status: AutomationAccessStatus.PENDING,
          requestedByUserId: userId
        },
        create: {
          workspaceId: resolvedWorkspaceId,
          templateId: agentId,
          requestedByUserId: userId,
          status: AutomationAccessStatus.PENDING
        }
      })
    ]);

    return {
      interestId: interest.id,
      accessRequestId: accessRequest.id,
      status: accessRequest.status
    };
  }

  async listInterests(): Promise<MarketplaceInterest[]> {
    const interests = await this.prisma.marketplaceInterest.findMany({
      include: {
        template: { select: { id: true, name: true, headline: true, category: true } },
        workspace: { select: { id: true, name: true } },
        requestedByUser: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return interests.map((interest) => ({
      ...interest,
      createdAt: interest.createdAt.toISOString(),
      updatedAt: interest.updatedAt.toISOString()
    }));
  }

  private mapTemplateToAgent(
    template: {
      id: string;
      name: string;
      headline: string | null;
      description: string | null;
      category: string;
      tags: string[];
      capabilities: string[];
      requirements: string[];
      rating: number;
      responseSlaSeconds: number;
      priceLabel: string | null;
      status: MarketplaceTemplateStatus;
      pingUrl: string | null;
      configJson: Prisma.JsonValue | null;
    },
    installs: number
  ): MarketplaceAgent {
    return {
      id: template.id,
      name: template.name,
      headline: template.headline ?? "Agente configurado pelo time CrmPexe.",
      description: template.description ?? "",
      categoryId: template.category,
      tags: template.tags,
      capabilities: template.capabilities,
      requirements: template.requirements,
      templateId: template.id,
      rating: template.rating,
      installs,
      responseSlaSeconds: template.responseSlaSeconds,
      priceLabel: template.priceLabel ?? undefined,
      status: template.status,
      pingUrl: template.pingUrl ?? undefined,
      configJson: template.configJson ?? null
    };
  }
}
