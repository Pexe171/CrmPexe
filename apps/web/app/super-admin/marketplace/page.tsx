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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchSuperAdminWorkspaces } from "@/lib/super-admin";

type MarketplaceTemplate = {
  id: string;
  name: string;
  categoryId: string;
  status?: "PENDING" | "APPROVED";
  canInstall?: boolean;
  requirements?: string[];
  configJson?: Record<string, unknown> | null;
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

const installTemplateForWorkspace = async ({
  templateId,
  targetWorkspaceId,
  configJson
}: {
  templateId: string;
  targetWorkspaceId: string;
  configJson: Record<string, string>;
}) => {
  const response = await fetch(
    `${apiUrl}/api/automation-templates/${templateId}/install`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetWorkspaceId,
        configJson
      })
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível implantar o agente neste workspace.");
  }

  return response.json();
};

const MarketplaceDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [installTemplate, setInstallTemplate] =
    useState<MarketplaceTemplate | null>(null);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {}
  );

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

  const filteredWorkspaces = useMemo(() => {
    const search = workspaceSearch.trim().toLowerCase();
    if (!search) {
      return workspaces;
    }
    return workspaces.filter((workspace) =>
      workspace.name.toLowerCase().includes(search)
    );
  }, [workspaceSearch, workspaces]);

  const installVariableKeys = useMemo(() => {
    if (!installTemplate?.requirements) {
      return [];
    }
    return installTemplate.requirements;
  }, [installTemplate]);

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

  const installMutation = useMutation({
    mutationFn: installTemplateForWorkspace,
    onSuccess: () => {
      setInstallTemplate(null);
      setWorkspaceSearch("");
      setTargetWorkspaceId("");
      setVariableValues({});
      queryClient.invalidateQueries({ queryKey: ["marketplace-interests"] });
    }
  });

  const handleOpenInstallModal = (template: MarketplaceTemplate) => {
    setInstallTemplate(template);
    setWorkspaceSearch("");
    setTargetWorkspaceId("");
    setVariableValues({});
  };

  const handleConfirmInstall = () => {
    if (!installTemplate || !targetWorkspaceId) {
      return;
    }

    installMutation.mutate({
      templateId: installTemplate.id,
      targetWorkspaceId,
      configJson: variableValues
    });
  };

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
                Templates disponíveis para implantação
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
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
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
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleOpenInstallModal(template)}
                    >
                      Instalar em Cliente
                    </Button>
                  </div>
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

      <Dialog
        open={Boolean(installTemplate)}
        onOpenChange={(open) => {
          if (!open) {
            setInstallTemplate(null);
            setWorkspaceSearch("");
            setTargetWorkspaceId("");
            setVariableValues({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Implantar Agente</DialogTitle>
            <DialogDescription>
              Selecione o workspace do cliente e configure as variáveis iniciais
              para o template <strong>{installTemplate?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="workspace-search">Workspace do cliente</Label>
              <Input
                id="workspace-search"
                placeholder="Buscar por nome (ex: Loja do João)"
                value={workspaceSearch}
                onChange={(event) => setWorkspaceSearch(event.target.value)}
              />
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-2">
                {filteredWorkspaces.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Nenhum workspace encontrado para esta busca.
                  </p>
                ) : (
                  filteredWorkspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      type="button"
                      className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                        targetWorkspaceId === workspace.id
                          ? "bg-purple-600 text-white"
                          : "text-slate-200 hover:bg-slate-800"
                      }`}
                      onClick={() => setTargetWorkspaceId(workspace.id)}
                    >
                      {workspace.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-100">
                Configuração de variáveis (opcional)
              </p>
              {installVariableKeys.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Este template não exige variáveis iniciais. O cliente também
                  poderá preencher depois em Chaves &amp; API.
                </p>
              ) : (
                <div className="grid gap-3">
                  {installVariableKeys.map((variableKey) => (
                    <div key={variableKey} className="space-y-1">
                      <Label htmlFor={`var-${variableKey}`}>
                        {variableKey}
                      </Label>
                      <Input
                        id={`var-${variableKey}`}
                        placeholder={`Valor para ${variableKey} (opcional)`}
                        value={variableValues[variableKey] ?? ""}
                        onChange={(event) =>
                          setVariableValues((prev) => ({
                            ...prev,
                            [variableKey]: event.target.value
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setInstallTemplate(null)}
              disabled={installMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmInstall}
              disabled={!targetWorkspaceId || installMutation.isPending}
            >
              {installMutation.isPending
                ? "Implantando..."
                : "Implantar Agente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
