import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

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
  rating: number;
  installs: number;
  responseSlaSeconds: number;
  priceLabel: string;
  status: "AVAILABLE" | "COMING_SOON";
};

export type MarketplaceAgentInput = {
  name: string;
  headline: string;
  description: string;
  categoryId: string;
  tags: string[];
  rating: number;
  installs: number;
  responseSlaSeconds: number;
  priceLabel: string;
  status: "AVAILABLE" | "COMING_SOON";
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

@Injectable()
export class MarketplaceService {
  private categories: StoredCategory[] = [
    {
      id: "atendimento",
      name: "Atendimento inteligente",
      description: "Bots e agentes que resolvem tickets, triagem e follow-up com SLA otimizado.",
      highlights: ["SLA em 30s", "Fila omnichannel", "LGPD by design"]
    },
    {
      id: "vendas",
      name: "Vendas e expansão",
      description: "Agentes focados em qualificação, pipeline e automação de propostas.",
      highlights: ["Lead scoring", "Resumo de calls", "Playbooks dinâmicos"]
    },
    {
      id: "sucesso",
      name: "Customer Success",
      description: "Monitoramento de saúde, onboarding e planos de sucesso personalizados.",
      highlights: ["Alertas proativos", "NPS em tempo real", "Planos de ação"]
    }
  ];

  private agents: MarketplaceAgent[] = [
    {
      id: "agent-exemplo",
      name: "Agent Atlas",
      headline: "Exemplo de agente pronto para ser editado pelo super admin.",
      description:
        "Esse agente é um modelo inicial. Altere o preço, a descrição e os detalhes pelo painel de super admin.",
      categoryId: "atendimento",
      tags: ["Exemplo", "Marketplace"],
      rating: 4.9,
      installs: 0,
      responseSlaSeconds: 45,
      priceLabel: "R$ 0,00",
      status: "AVAILABLE"
    }
  ];

  getSummary(): MarketplaceSummary {
    return {
      headline: "Marketplace de agentes especialistas para cada etapa do seu CRM.",
      activeAgents: this.agents.filter((agent) => agent.status === "AVAILABLE").length,
      automationsAvailable: 42,
      averageNps: 68,
      satisfactionRate: 0.93,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  getCategories(): MarketplaceCategory[] {
    return this.categories.map((category) => ({
      ...category,
      agentsCount: this.agents.filter((agent) => agent.categoryId === category.id).length
    }));
  }

  createCategory(input: MarketplaceCategoryInput): MarketplaceCategory {
    const newCategory: StoredCategory = {
      id: input.id?.trim() || randomUUID(),
      name: input.name.trim(),
      description: input.description.trim(),
      highlights: input.highlights ?? []
    };

    this.categories.push(newCategory);

    return {
      ...newCategory,
      agentsCount: this.agents.filter((agent) => agent.categoryId === newCategory.id).length
    };
  }

  updateCategory(id: string, input: Partial<MarketplaceCategoryInput>): MarketplaceCategory | null {
    const index = this.categories.findIndex((category) => category.id === id);
    if (index === -1) return null;

    const current = this.categories[index];
    const updated: StoredCategory = {
      ...current,
      ...("name" in input && input.name ? { name: input.name.trim() } : null),
      ...("description" in input && input.description
        ? { description: input.description.trim() }
        : null),
      ...("highlights" in input && input.highlights ? { highlights: input.highlights } : null)
    };

    this.categories[index] = updated;

    return {
      ...updated,
      agentsCount: this.agents.filter((agent) => agent.categoryId === updated.id).length
    };
  }

  removeCategory(id: string): boolean {
    const index = this.categories.findIndex((category) => category.id === id);
    if (index === -1) return false;

    this.categories.splice(index, 1);
    return true;
  }

  getAgents(params?: { category?: string; search?: string }): MarketplaceAgent[] {
    const category = params?.category?.trim();
    const search = params?.search?.trim().toLowerCase();

    return this.agents.filter((agent) => {
      const matchesCategory = category ? agent.categoryId === category : true;
      const matchesSearch = search
        ? [agent.name, agent.headline, agent.description, ...agent.tags]
            .join(" ")
            .toLowerCase()
            .includes(search)
        : true;

      return matchesCategory && matchesSearch;
    });
  }

  createAgent(input: MarketplaceAgentInput): MarketplaceAgent {
    const newAgent: MarketplaceAgent = {
      id: randomUUID(),
      name: input.name.trim(),
      headline: input.headline.trim(),
      description: input.description.trim(),
      categoryId: input.categoryId.trim(),
      tags: input.tags ?? [],
      rating: Number.isFinite(input.rating) ? input.rating : 4.5,
      installs: Number.isFinite(input.installs) ? input.installs : 0,
      responseSlaSeconds: Number.isFinite(input.responseSlaSeconds)
        ? input.responseSlaSeconds
        : 60,
      priceLabel: input.priceLabel.trim(),
      status: input.status ?? "AVAILABLE"
    };

    this.agents.push(newAgent);
    return newAgent;
  }

  updateAgent(id: string, input: Partial<MarketplaceAgentInput>): MarketplaceAgent | null {
    const index = this.agents.findIndex((agent) => agent.id === id);
    if (index === -1) return null;

    const current = this.agents[index];
    const updated: MarketplaceAgent = {
      ...current,
      ...("name" in input && input.name ? { name: input.name.trim() } : null),
      ...("headline" in input && input.headline ? { headline: input.headline.trim() } : null),
      ...("description" in input && input.description
        ? { description: input.description.trim() }
        : null),
      ...("categoryId" in input && input.categoryId
        ? { categoryId: input.categoryId.trim() }
        : null),
      ...("tags" in input && input.tags ? { tags: input.tags } : null),
      ...("rating" in input && Number.isFinite(input.rating)
        ? { rating: input.rating }
        : null),
      ...("installs" in input && Number.isFinite(input.installs)
        ? { installs: input.installs }
        : null),
      ...("responseSlaSeconds" in input && Number.isFinite(input.responseSlaSeconds)
        ? { responseSlaSeconds: input.responseSlaSeconds }
        : null),
      ...("priceLabel" in input && input.priceLabel
        ? { priceLabel: input.priceLabel.trim() }
        : null),
      ...("status" in input && input.status ? { status: input.status } : null)
    };

    this.agents[index] = updated;
    return updated;
  }

  removeAgent(id: string): boolean {
    const index = this.agents.findIndex((agent) => agent.id === id);
    if (index === -1) return false;

    this.agents.splice(index, 1);
    return true;
  }
}
