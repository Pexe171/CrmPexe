"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type MarketplaceCategory = {
  id: string;
  name: string;
  description: string;
  highlights: string[];
  agentsCount: number;
};

type MarketplaceAgent = {
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

type FormState = {
  categoryName: string;
  categoryDescription: string;
  categoryHighlights: string;
  agentName: string;
  agentHeadline: string;
  agentDescription: string;
  agentCategoryId: string;
  agentTags: string;
  agentRating: string;
  agentInstalls: string;
  agentSla: string;
  agentPrice: string;
  agentStatus: "AVAILABLE" | "COMING_SOON";
};

const initialFormState: FormState = {
  categoryName: "",
  categoryDescription: "",
  categoryHighlights: "",
  agentName: "",
  agentHeadline: "",
  agentDescription: "",
  agentCategoryId: "",
  agentTags: "",
  agentRating: "",
  agentInstalls: "",
  agentSla: "",
  agentPrice: "",
  agentStatus: "AVAILABLE"
};

const toTags = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function SuperAdminMarketplacePage() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalAgents = useMemo(() => agents.length, [agents]);

  const loadMarketplace = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const [categoriesResponse, agentsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/marketplace/categories`, { credentials: "include" }),
        fetch(`${apiUrl}/api/marketplace/agents`, { credentials: "include" })
      ]);

      if (!categoriesResponse.ok || !agentsResponse.ok) {
        throw new Error("Não foi possível carregar o marketplace.");
      }

      const [categoriesData, agentsData] = await Promise.all([
        categoriesResponse.json() as Promise<MarketplaceCategory[]>,
        agentsResponse.json() as Promise<MarketplaceAgent[]>
      ]);

      setCategories(categoriesData);
      setAgents(agentsData);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao carregar o marketplace."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMarketplace();
  }, []);

  const handleFormChange = (key: keyof FormState, value: string) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleAgentFieldChange = (
    id: string,
    key: keyof MarketplaceAgent,
    value: string
  ) => {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === id
          ? {
              ...agent,
              [key]:
                key === "rating" || key === "installs" || key === "responseSlaSeconds"
                  ? Number(value)
                  : key === "tags"
                    ? toTags(value)
                    : value
            }
          : agent
      )
    );
  };

  const handleCategoryFieldChange = (
    id: string,
    key: keyof MarketplaceCategory,
    value: string
  ) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === id
          ? {
              ...category,
              [key]: key === "highlights" ? toTags(value) : value
            }
          : category
      )
    );
  };

  const handleCreateCategory = async () => {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/marketplace/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formState.categoryName,
          description: formState.categoryDescription,
          highlights: toTags(formState.categoryHighlights)
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível criar a categoria.");
      }

      setFormState((current) => ({
        ...current,
        categoryName: "",
        categoryDescription: "",
        categoryHighlights: ""
      }));
      setMessage("Categoria criada com sucesso.");
      await loadMarketplace();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Erro ao criar categoria.");
    }
  };

  const handleUpdateCategory = async (category: MarketplaceCategory) => {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/marketplace/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          highlights: category.highlights
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar a categoria.");
      }

      setMessage("Categoria atualizada com sucesso.");
      await loadMarketplace();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar categoria.");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/marketplace/categories/${categoryId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível remover a categoria.");
      }

      setMessage("Categoria removida com sucesso.");
      await loadMarketplace();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro ao remover categoria.");
    }
  };

  const handleCreateAgent = async () => {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/marketplace/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formState.agentName,
          headline: formState.agentHeadline,
          description: formState.agentDescription,
          categoryId: formState.agentCategoryId,
          tags: toTags(formState.agentTags),
          rating: Number(formState.agentRating || 0),
          installs: Number(formState.agentInstalls || 0),
          responseSlaSeconds: Number(formState.agentSla || 0),
          priceLabel: formState.agentPrice,
          status: formState.agentStatus
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível criar o agente.");
      }

      setFormState((current) => ({
        ...current,
        agentName: "",
        agentHeadline: "",
        agentDescription: "",
        agentCategoryId: "",
        agentTags: "",
        agentRating: "",
        agentInstalls: "",
        agentSla: "",
        agentPrice: "",
        agentStatus: "AVAILABLE"
      }));
      setMessage("Agente criado com sucesso.");
      await loadMarketplace();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Erro ao criar agente.");
    }
  };

  const handleUpdateAgent = async (agent: MarketplaceAgent) => {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/marketplace/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: agent.name,
          headline: agent.headline,
          description: agent.description,
          categoryId: agent.categoryId,
          tags: agent.tags,
          rating: agent.rating,
          installs: agent.installs,
          responseSlaSeconds: agent.responseSlaSeconds,
          priceLabel: agent.priceLabel,
          status: agent.status
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar o agente.");
      }

      setMessage("Agente atualizado com sucesso.");
      await loadMarketplace();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar agente.");
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/marketplace/agents/${agentId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível remover o agente.");
      }

      setMessage("Agente removido com sucesso.");
      await loadMarketplace();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro ao remover agente.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b bg-slate-900 px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex items-center gap-3">
            <SidebarNav variant="superadmin" />
            <p className="text-sm font-medium text-purple-600">Super Admin</p>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">Marketplace do CRM</h1>
          <p className="text-sm text-slate-400">
            Cadastre, edite e publique agentes com preços e descrições sob seu controle.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/super-admin">
              <Button variant="outline">Voltar ao painel</Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline">Ver marketplace público</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Agentes cadastrados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {loading ? "-" : totalAgents}
            </p>
          </div>
          <div className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Categorias ativas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {loading ? "-" : categories.length}
            </p>
          </div>
          <div className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Status</p>
            <p className="mt-2 text-sm text-slate-200">
              {loading ? "Carregando..." : "Marketplace sob seu controle"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-100">Criar nova categoria</h2>
          <p className="text-sm text-slate-400">
            Use categorias para organizar o marketplace por objetivo do agente.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Nome da categoria"
              value={formState.categoryName}
              onChange={(event) => handleFormChange("categoryName", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Descrição"
              value={formState.categoryDescription}
              onChange={(event) => handleFormChange("categoryDescription", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Destaques (separados por vírgula)"
              value={formState.categoryHighlights}
              onChange={(event) => handleFormChange("categoryHighlights", event.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleCreateCategory}>Salvar categoria</Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-100">Categorias publicadas</h2>
          <div className="mt-4 space-y-4">
            {loading ? (
              <p className="text-sm text-slate-400">Carregando categorias...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma categoria cadastrada.</p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="rounded-xl border border-slate-800 p-4">
                  <div className="grid gap-3 md:grid-cols-[1.1fr_1.4fr_1.4fr_auto]">
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={category.name}
                      onChange={(event) =>
                        handleCategoryFieldChange(category.id, "name", event.target.value)
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={category.description}
                      onChange={(event) =>
                        handleCategoryFieldChange(category.id, "description", event.target.value)
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={category.highlights.join(", ")}
                      onChange={(event) =>
                        handleCategoryFieldChange(category.id, "highlights", event.target.value)
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => handleUpdateCategory(category)}>
                        Atualizar
                      </Button>
                      <Button variant="outline" onClick={() => handleDeleteCategory(category.id)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-100">Criar novo agente</h2>
          <p className="text-sm text-slate-400">
            Defina o preço, o SLA e a descrição que o cliente verá no marketplace.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Nome do agente"
              value={formState.agentName}
              onChange={(event) => handleFormChange("agentName", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Headline"
              value={formState.agentHeadline}
              onChange={(event) => handleFormChange("agentHeadline", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Categoria (id)"
              value={formState.agentCategoryId}
              onChange={(event) => handleFormChange("agentCategoryId", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Tags (separadas por vírgula)"
              value={formState.agentTags}
              onChange={(event) => handleFormChange("agentTags", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Avaliação (ex: 4.8)"
              value={formState.agentRating}
              onChange={(event) => handleFormChange("agentRating", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Instalações"
              value={formState.agentInstalls}
              onChange={(event) => handleFormChange("agentInstalls", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="SLA (segundos)"
              value={formState.agentSla}
              onChange={(event) => handleFormChange("agentSla", event.target.value)}
            />
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Preço exibido (ex: R$ 499/mês)"
              value={formState.agentPrice}
              onChange={(event) => handleFormChange("agentPrice", event.target.value)}
            />
            <select
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              value={formState.agentStatus}
              onChange={(event) =>
                handleFormChange("agentStatus", event.target.value as FormState["agentStatus"])
              }
            >
              <option value="AVAILABLE">Disponível</option>
              <option value="COMING_SOON">Em breve</option>
            </select>
            <textarea
              className="min-h-[120px] rounded-lg border border-slate-800 px-3 py-2 text-sm md:col-span-2"
              placeholder="Descrição completa"
              value={formState.agentDescription}
              onChange={(event) => handleFormChange("agentDescription", event.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleCreateAgent}>Salvar agente</Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Agentes publicados</h2>
              <p className="text-sm text-slate-400">
                Atualize o catálogo e os preços direto pelo painel do super admin.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-6">
            {loading ? (
              <p className="text-sm text-slate-400">Carregando agentes...</p>
            ) : agents.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum agente cadastrado.</p>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="rounded-xl border border-slate-800 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.name}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "name", event.target.value)
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.headline}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "headline", event.target.value)
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.categoryId}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "categoryId", event.target.value)
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.tags.join(", ")}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "tags", event.target.value)
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.priceLabel}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "priceLabel", event.target.value)
                      }
                    />
                    <select
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.status}
                      onChange={(event) =>
                        handleAgentFieldChange(
                          agent.id,
                          "status",
                          event.target.value as MarketplaceAgent["status"]
                        )
                      }
                    >
                      <option value="AVAILABLE">Disponível</option>
                      <option value="COMING_SOON">Em breve</option>
                    </select>
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.rating}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "rating", event.target.value)
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.installs}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "installs", event.target.value)
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.responseSlaSeconds}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "responseSlaSeconds", event.target.value)
                      }
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-[120px] w-full rounded-lg border border-slate-800 px-3 py-2 text-sm"
                    value={agent.description}
                    onChange={(event) =>
                      handleAgentFieldChange(agent.id, "description", event.target.value)
                    }
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => handleUpdateAgent(agent)}>
                      Atualizar agente
                    </Button>
                    <Button variant="outline" onClick={() => handleDeleteAgent(agent.id)}>
                      Remover agente
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
