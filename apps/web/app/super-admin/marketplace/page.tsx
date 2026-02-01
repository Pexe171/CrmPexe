"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type MarketplaceAgent = {
  id: string;
  name: string;
  description: string;
  status: "PENDING" | "APPROVED";
  pingUrl?: string;
  configJson?: string;
};

type FormState = {
  agentName: string;
  agentDescription: string;
  agentPingUrl: string;
  agentConfigJson: string;
  agentStatus: "PENDING" | "APPROVED";
};

const initialFormState: FormState = {
  agentName: "",
  agentDescription: "",
  agentPingUrl: "",
  agentConfigJson: "",
  agentStatus: "PENDING"
};

export default function SuperAdminMarketplacePage() {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [releaseWorkspaceIds, setReleaseWorkspaceIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalAgents = useMemo(() => agents.length, [agents]);

  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const agentsResponse = await fetch(`${apiUrl}/api/marketplace/agents`, {
        credentials: "include"
      });

      if (!agentsResponse.ok) {
        throw new Error("Não foi possível carregar os agentes.");
      }

      const agentsData = (await agentsResponse.json()) as MarketplaceAgent[];
      setAgents(agentsData);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao carregar os agentes."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgents();
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
              [key]: value
            }
          : agent
      )
    );
  };

  const handleReleaseWorkspaceChange = (agentId: string, value: string) => {
    setReleaseWorkspaceIds((current) => ({ ...current, [agentId]: value }));
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
          description: formState.agentDescription,
          status: formState.agentStatus,
          pingUrl: formState.agentPingUrl,
          configJson: formState.agentConfigJson
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível criar o agente.");
      }

      setFormState(initialFormState);
      setMessage("Agente criado com sucesso.");
      await loadAgents();
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
          description: agent.description,
          status: agent.status,
          pingUrl: agent.pingUrl,
          configJson: agent.configJson
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar o agente.");
      }

      setMessage("Agente atualizado com sucesso.");
      await loadAgents();
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
      await loadAgents();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro ao remover agente.");
    }
  };

  const handleReleaseAgent = async (agentId: string) => {
    setError(null);
    setMessage(null);

    const workspaceId = releaseWorkspaceIds[agentId]?.trim();
    if (!workspaceId) {
      setError("Informe o workspace antes de liberar o agente.");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/marketplace/agents/${agentId}/install`, {
        method: "POST",
        headers: { "x-workspace-id": workspaceId },
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível liberar o agente para o workspace.");
      }

      setMessage("Agente liberado para o workspace com sucesso.");
      await loadAgents();
    } catch (releaseError) {
      setError(
        releaseError instanceof Error
          ? releaseError.message
          : "Erro ao liberar agente para o workspace."
      );
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
          <h1 className="text-2xl font-semibold text-slate-100">Agentes do CRM</h1>
          <p className="text-sm text-slate-400">
            Cadastre agentes personalizados, defina o status e libere cada agente para um workspace
            específico.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/super-admin">
              <Button variant="outline">Voltar ao painel</Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline">Ver área de agentes</Button>
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

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Agentes cadastrados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {loading ? "-" : totalAgents}
            </p>
          </div>
          <div className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Status</p>
            <p className="mt-2 text-sm text-slate-200">
              {loading ? "Carregando..." : "Controle centralizado de agentes"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-100">Cadastrar novo agente</h2>
          <p className="text-sm text-slate-400">
            Preencha a descrição, ping e JSON técnico para liberar o agente do cliente.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              placeholder="Nome do agente"
              value={formState.agentName}
              onChange={(event) => handleFormChange("agentName", event.target.value)}
            />
            <select
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
              value={formState.agentStatus}
              onChange={(event) =>
                handleFormChange("agentStatus", event.target.value as FormState["agentStatus"])
              }
            >
              <option value="PENDING">Pendente</option>
              <option value="APPROVED">Aprovado</option>
            </select>
            <input
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm md:col-span-2"
              placeholder="URL de ping"
              value={formState.agentPingUrl}
              onChange={(event) => handleFormChange("agentPingUrl", event.target.value)}
            />
            <textarea
              className="min-h-[120px] rounded-lg border border-slate-800 px-3 py-2 text-sm md:col-span-2"
              placeholder="Descrição do agente"
              value={formState.agentDescription}
              onChange={(event) => handleFormChange("agentDescription", event.target.value)}
            />
            <textarea
              className="min-h-[140px] rounded-lg border border-slate-800 px-3 py-2 text-sm md:col-span-2"
              placeholder="JSON de configuração"
              value={formState.agentConfigJson}
              onChange={(event) => handleFormChange("agentConfigJson", event.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleCreateAgent}>Salvar agente</Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Agentes atribuídos</h2>
              <p className="text-sm text-slate-400">
                Atualize a descrição, o status e a configuração conforme a solicitação do cliente.
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
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                      value={agent.name}
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "name", event.target.value)
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
                      <option value="PENDING">Pendente</option>
                      <option value="APPROVED">Aprovado</option>
                    </select>
                    <input
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm md:col-span-2"
                      value={agent.pingUrl ?? ""}
                      placeholder="URL de ping"
                      onChange={(event) =>
                        handleAgentFieldChange(agent.id, "pingUrl", event.target.value)
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
                  <textarea
                    className="mt-3 min-h-[140px] w-full rounded-lg border border-slate-800 px-3 py-2 text-sm"
                    value={agent.configJson ?? ""}
                    placeholder="JSON de configuração"
                    onChange={(event) =>
                      handleAgentFieldChange(agent.id, "configJson", event.target.value)
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
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Liberar para workspace
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <input
                        className="min-w-[220px] flex-1 rounded-lg border border-slate-800 px-3 py-2 text-sm"
                        placeholder="ID do workspace"
                        value={releaseWorkspaceIds[agent.id] ?? ""}
                        onChange={(event) =>
                          handleReleaseWorkspaceChange(agent.id, event.target.value)
                        }
                      />
                      <Button onClick={() => handleReleaseAgent(agent.id)}>
                        Liberar agente
                      </Button>
                    </div>
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
