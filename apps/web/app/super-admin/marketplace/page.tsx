"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";

type AgentStatus = "Rascunho" | "Publicado";

type CatalogAgent = {
  id: string;
  title: string;
  description: string;
  image: string;
  status: AgentStatus;
};

type Workspace = {
  id: string;
  name: string;
  segment: string;
};

type AutomationPermission = {
  id: string;
  title: string;
  category: string;
  enabled: boolean;
};

type LeadRequest = {
  id: string;
  company: string;
  contact: string;
  automation: string;
  workspace: string;
  createdAt: string;
};

const initialCatalog: CatalogAgent[] = [
  {
    id: "crm-01",
    title: "Agente de Vendas Ativo",
    description: "Qualifica leads e sugere próximos passos com base no funil.",
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=400",
    status: "Publicado"
  },
  {
    id: "crm-02",
    title: "Agente Pós-venda",
    description: "Cria follow-ups automáticos e monitoramento de satisfação.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=400",
    status: "Rascunho"
  },
  {
    id: "crm-03",
    title: "Agente de Retenção",
    description: "Detecta risco de churn e dispara campanhas preventivas.",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=400",
    status: "Publicado"
  }
];

const workspaces: Workspace[] = [
  { id: "ws-100", name: "Grupo Sumaré", segment: "Varejo" },
  { id: "ws-204", name: "Arco Finanças", segment: "Serviços financeiros" },
  { id: "ws-309", name: "Nexa Educação", segment: "Educação" }
];

const defaultPermissions: AutomationPermission[] = [
  { id: "auto-01", title: "Auto Cadência de Follow-up", category: "Vendas", enabled: true },
  { id: "auto-02", title: "Respostas WhatsApp Inteligentes", category: "Atendimento", enabled: false },
  { id: "auto-03", title: "Análise de Sentimento", category: "Suporte", enabled: true },
  { id: "auto-04", title: "Push de Meta Diária", category: "Gestão", enabled: false },
  { id: "auto-05", title: "Recuperação de Inativos", category: "Marketing", enabled: true }
];

const leadRequests: LeadRequest[] = [
  {
    id: "lead-01",
    company: "Horizonte Tech",
    contact: "Camila Prado",
    automation: "Auto Cadência de Follow-up",
    workspace: "ws-100",
    createdAt: "Há 2h"
  },
  {
    id: "lead-02",
    company: "Nexus Serviços",
    contact: "Bruno Martins",
    automation: "Respostas WhatsApp Inteligentes",
    workspace: "ws-204",
    createdAt: "Há 6h"
  },
  {
    id: "lead-03",
    company: "Delta Saúde",
    contact: "Ana Suárez",
    automation: "Análise de Sentimento",
    workspace: "ws-309",
    createdAt: "Ontem"
  }
];

export default function SuperAdminMarketplacePage() {
  const [catalogAgents, setCatalogAgents] = useState<CatalogAgent[]>(initialCatalog);
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id ?? "");
  const [permissions, setPermissions] = useState<AutomationPermission[]>(defaultPermissions);
  const [newAgent, setNewAgent] = useState({
    title: "",
    description: "",
    image: "",
    status: "Rascunho" as AgentStatus
  });

  const publishedCount = useMemo(
    () => catalogAgents.filter((agent) => agent.status === "Publicado").length,
    [catalogAgents]
  );

  const handleCatalogChange = (
    agentId: string,
    key: keyof CatalogAgent,
    value: string
  ) => {
    setCatalogAgents((current) =>
      current.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              [key]: value
            }
          : agent
      )
    );
  };

  const handlePermissionToggle = (permissionId: string) => {
    setPermissions((current) =>
      current.map((permission) =>
        permission.id === permissionId
          ? { ...permission, enabled: !permission.enabled }
          : permission
      )
    );
  };

  const handleCreateAgent = () => {
    if (!newAgent.title.trim()) {
      return;
    }

    setCatalogAgents((current) => [
      {
        id: `crm-${Date.now()}`,
        title: newAgent.title,
        description: newAgent.description || "Descrição pendente.",
        image: newAgent.image || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400",
        status: newAgent.status
      },
      ...current
    ]);

    setNewAgent({ title: "", description: "", image: "", status: "Rascunho" });
  };

  const handleDeleteAgent = (agentId: string) => {
    setCatalogAgents((current) => current.filter((agent) => agent.id !== agentId));
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b bg-slate-900 px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex items-center gap-3">
            <SidebarNav variant="superadmin" />
            <p className="text-sm font-medium text-purple-600">Super Admin</p>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">Dashboard Marketplace</h1>
          <p className="text-sm text-slate-400">
            Onde a mágica acontece: centralize catálogo, permissões e solicitações de interesse.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/super-admin">
              <Button variant="outline">Voltar ao painel</Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline">Abrir marketplace público</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Agentes no catálogo</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{catalogAgents.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Publicados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{publishedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Solicitações pendentes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{leadRequests.length}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Gerenciar o catálogo</h2>
              <p className="text-sm text-slate-400">
                Crie, edite ou exclua agentes do marketplace com título, descrição e imagem.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
              {publishedCount} publicados
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Novo agente
              </h3>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  placeholder="Título do agente"
                  value={newAgent.title}
                  onChange={(event) => setNewAgent({ ...newAgent, title: event.target.value })}
                />
                <textarea
                  className="min-h-[100px] rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  placeholder="Descrição curta"
                  value={newAgent.description}
                  onChange={(event) =>
                    setNewAgent({ ...newAgent, description: event.target.value })
                  }
                />
                <input
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  placeholder="URL da imagem"
                  value={newAgent.image}
                  onChange={(event) => setNewAgent({ ...newAgent, image: event.target.value })}
                />
                <select
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={newAgent.status}
                  onChange={(event) =>
                    setNewAgent({ ...newAgent, status: event.target.value as AgentStatus })
                  }
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Publicado">Publicado</option>
                </select>
                <Button onClick={handleCreateAgent}>Cadastrar agente</Button>
              </div>
            </div>

            <div className="space-y-4">
              {catalogAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={agent.image}
                      alt={agent.title}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <input
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        value={agent.title}
                        onChange={(event) =>
                          handleCatalogChange(agent.id, "title", event.target.value)
                        }
                      />
                      <p className="mt-1 text-xs text-slate-400">ID: {agent.id}</p>
                    </div>
                    <select
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                      value={agent.status}
                      onChange={(event) =>
                        handleCatalogChange(
                          agent.id,
                          "status",
                          event.target.value as AgentStatus
                        )
                      }
                    >
                      <option value="Rascunho">Rascunho</option>
                      <option value="Publicado">Publicado</option>
                    </select>
                  </div>
                  <textarea
                    className="min-h-[90px] rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    value={agent.description}
                    onChange={(event) =>
                      handleCatalogChange(agent.id, "description", event.target.value)
                    }
                  />
                  <input
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    value={agent.image}
                    onChange={(event) =>
                      handleCatalogChange(agent.id, "image", event.target.value)
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline">Salvar alterações</Button>
                    <Button variant="outline" onClick={() => handleDeleteAgent(agent.id)}>
                      Excluir agente
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Gerenciar permissões por workspace
              </h2>
              <p className="text-sm text-slate-400">
                Selecione um workspace e habilite as automações que ele poderá acessar.
              </p>
            </div>
            <select
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={selectedWorkspace}
              onChange={(event) => setSelectedWorkspace(event.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} · {workspace.segment}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">{permission.title}</p>
                  <p className="text-xs text-slate-400">{permission.category}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{permission.enabled ? "Ativo" : "Inativo"}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-purple-500"
                    checked={permission.enabled}
                    onChange={() => handlePermissionToggle(permission.id)}
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button>Salvar permissões</Button>
            <Button variant="outline">Aplicar a todos os workspaces</Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Workspace selecionado: <span className="text-slate-300">{selectedWorkspace}</span>
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Solicitações de interesse</h2>
              <p className="text-sm text-slate-400">
                Leads internos que clicaram em “Tenho interesse” no marketplace.
              </p>
            </div>
            <Button variant="outline">Exportar lista</Button>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-950 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Automação</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {leadRequests.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-4 py-3 font-semibold text-slate-100">{lead.company}</td>
                    <td className="px-4 py-3 text-slate-300">{lead.contact}</td>
                    <td className="px-4 py-3 text-slate-300">{lead.automation}</td>
                    <td className="px-4 py-3 text-slate-300">{lead.workspace}</td>
                    <td className="px-4 py-3 text-slate-400">{lead.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
