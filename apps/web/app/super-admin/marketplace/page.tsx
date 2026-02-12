"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { fetchSuperAdminWorkspaces } from "@/lib/super-admin";

type MarketplaceTemplate = {
  id: string;
  name: string;
  categoryId: string;
  status?: "PENDING" | "APPROVED";
  canInstall?: boolean;
};

type LeadRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  template: {
    id: string;
    name: string;
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

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const statusLabels = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado"
} as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));

const fetchMarketplaceInterests = async (
  signal?: AbortSignal
): Promise<LeadRequest[]> => {
  const response = await fetch(`${apiUrl}/api/marketplace/interests`, {
    credentials: "include",
    signal
  });

  if (!response.ok) {
    throw new Error(
      "Não foi possível carregar as solicitações do marketplace."
    );
  }

  return (await response.json()) as LeadRequest[];
};

const fetchMarketplaceTemplates = async (
  workspaceId: string,
  signal?: AbortSignal
): Promise<MarketplaceTemplate[]> => {
  const response = await fetch(`${apiUrl}/api/marketplace/agents`, {
    credentials: "include",
    signal,
    headers: { "x-workspace-id": workspaceId }
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar as automações do marketplace.");
  }

  return (await response.json()) as MarketplaceTemplate[];
};

const toggleMarketplaceAccess = async ({
  templateId,
  workspaceId,
  enabled
}: {
  templateId: string;
  workspaceId: string;
  enabled: boolean;
}) => {
  const response = await fetch(
    `${apiUrl}/api/marketplace/agents/${templateId}/access`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, enabled })
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível atualizar o acesso da automação.");
  }

  return response.json();
};

const MarketplaceDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedWorkspace, setSelectedWorkspace] = useState("");

  const { data: workspacesData, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["super-admin-workspaces"],
    queryFn: ({ signal }) => fetchSuperAdminWorkspaces(signal)
  });

  const workspaces = useMemo(
    () =>
      (workspacesData?.data ?? []).map((workspace) => ({
        id: workspace.id,
        name: workspace.name
      })),
    [workspacesData]
  );

  useEffect(() => {
    if (!selectedWorkspace && workspaces.length > 0) {
      setSelectedWorkspace(workspaces[0].id);
    }
  }, [selectedWorkspace, workspaces]);

  const {
    data: templates = [],
    isLoading: isLoadingTemplates,
    isError: hasTemplatesError
  } = useQuery({
    queryKey: ["marketplace-templates", selectedWorkspace],
    queryFn: ({ signal }) =>
      fetchMarketplaceTemplates(selectedWorkspace, signal),
    enabled: Boolean(selectedWorkspace)
  });

  const {
    data: leadRequests = [],
    isLoading: isLoadingLeads,
    isError: hasLeadsError
  } = useQuery({
    queryKey: ["marketplace-interests"],
    queryFn: ({ signal }) => fetchMarketplaceInterests(signal)
  });

  const publishedCount = useMemo(
    () => templates.filter((template) => template.status === "APPROVED").length,
    [templates]
  );

  const toggleAccessMutation = useMutation({
    mutationFn: toggleMarketplaceAccess,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["marketplace-templates", variables.workspaceId]
      });
    }
  });

  const resolveLeadMutation = useMutation({
    mutationFn: toggleMarketplaceAccess,
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<LeadRequest[]>(
        ["marketplace-interests"],
        (current = []) =>
          current.map((lead) =>
            lead.template.id === variables.templateId &&
            lead.workspace.id === variables.workspaceId
              ? { ...lead, status: "APPROVED" }
              : lead
          )
      );
      queryClient.invalidateQueries({
        queryKey: ["marketplace-templates", variables.workspaceId]
      });
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 md:pl-72">
      <header className="border-b bg-slate-900 px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex items-center gap-3">
            <SidebarNav variant="superadmin" />
            <p className="text-sm font-medium text-purple-600">Super Admin</p>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Dashboard Marketplace
          </h1>
          <p className="text-sm text-slate-400">
            Onde a mágica acontece: centralize catálogo, permissões e
            solicitações de interesse.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/super-admin">
              <Button variant="outline">Voltar ao painel</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">
              Agentes no catálogo
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {templates.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Publicados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {publishedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">
              Solicitações pendentes
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {leadRequests.filter((lead) => lead.status === "PENDING").length}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Gerenciar permissões por workspace
              </h2>
              <p className="text-sm text-slate-400">
                Selecione um workspace e habilite as automações que ele poderá
                acessar.
              </p>
            </div>
            <select
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={selectedWorkspace}
              onChange={(event) => setSelectedWorkspace(event.target.value)}
              disabled={isLoadingWorkspaces || workspaces.length === 0}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {isLoadingTemplates ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                Carregando automações do marketplace...
              </div>
            ) : null}
            {hasTemplatesError ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-rose-300">
                Não foi possível carregar as automações. Verifique a conexão com
                a API.
              </div>
            ) : null}
            {!isLoadingTemplates &&
            !hasTemplatesError &&
            templates.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                Nenhuma automação encontrada para este workspace.
              </div>
            ) : null}
            {templates.map((template) => {
              const enabled = Boolean(template.canInstall);
              const isToggling =
                toggleAccessMutation.isPending &&
                toggleAccessMutation.variables?.templateId === template.id;

              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {template.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {template.categoryId}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{enabled ? "Ativo" : "Inativo"}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-purple-500"
                      checked={enabled}
                      onChange={() =>
                        toggleAccessMutation.mutate({
                          templateId: template.id,
                          workspaceId: selectedWorkspace,
                          enabled: !enabled
                        })
                      }
                      disabled={isToggling || !selectedWorkspace}
                    />
                  </label>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Workspace selecionado:{" "}
            <span className="text-slate-300">{selectedWorkspace}</span>
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Solicitações de interesse
              </h2>
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
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Automação</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Data do pedido</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {isLoadingLeads ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      Carregando solicitações...
                    </td>
                  </tr>
                ) : null}
                {hasLeadsError ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-rose-300"
                    >
                      Não foi possível carregar as solicitações. Verifique a
                      API.
                    </td>
                  </tr>
                ) : null}
                {!isLoadingLeads &&
                !hasLeadsError &&
                leadRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      Nenhuma solicitação encontrada no momento.
                    </td>
                  </tr>
                ) : null}
                {leadRequests.map((lead) => {
                  const isResolving =
                    resolveLeadMutation.isPending &&
                    resolveLeadMutation.variables?.templateId ===
                      lead.template.id &&
                    resolveLeadMutation.variables?.workspaceId ===
                      lead.workspace.id;

                  return (
                    <tr key={lead.id}>
                      <td className="px-4 py-3 font-semibold text-slate-100">
                        {lead.workspace.name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {lead.template.name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div className="font-medium text-slate-100">
                          {lead.requestedByUser.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lead.requestedByUser.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {statusLabels[lead.status]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            resolveLeadMutation.mutate({
                              templateId: lead.template.id,
                              workspaceId: lead.workspace.id,
                              enabled: true
                            })
                          }
                          disabled={lead.status === "APPROVED" || isResolving}
                        >
                          {lead.status === "APPROVED"
                            ? "Resolvido"
                            : "Marcar como Resolvido/Contactado"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default function SuperAdminMarketplacePage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MarketplaceDashboard />
    </QueryClientProvider>
  );
}
