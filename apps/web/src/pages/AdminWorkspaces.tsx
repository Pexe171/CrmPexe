import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api/agents";
import type { AdminWorkspace, AgentTemplateListItem, WorkspaceAgentDetail } from "@/lib/api/agents";
import { Search, Building2, Bot, Calendar, Users, Plus, CheckCircle, XCircle } from "lucide-react";

export default function AdminWorkspacesPage() {
  const { data: me } = useAuthMe();
  const queryClient = useQueryClient();
  const isAdmin = Boolean(me?.isSuperAdmin || me?.role === "ADMIN");

  const [search, setSearch] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<AdminWorkspace | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignAgentId, setAssignAgentId] = useState("");
  const [assignExpiry, setAssignExpiry] = useState("");
  const [feedback, setFeedback] = useState("");

  const { data: workspaces = [], isLoading: loadingWorkspaces } = useQuery({
    queryKey: ["admin", "workspaces", search],
    queryFn: () => agentsApi.adminListWorkspaces(search || undefined),
    enabled: isAdmin
  });

  const { data: workspaceAgents = [] } = useQuery({
    queryKey: ["admin", "workspace-agents", selectedWorkspace?.id],
    queryFn: () => agentsApi.adminGetWorkspaceAgents(selectedWorkspace!.id),
    enabled: !!selectedWorkspace
  });

  const { data: templatesResponse } = useQuery({
    queryKey: ["agents", "templates"],
    queryFn: agentsApi.listTemplates,
    enabled: isAdmin
  });

  const publishedTemplates = (templatesResponse?.data ?? []).filter(
    (t) => t.status === "PUBLISHED"
  );

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkspace || !assignAgentId) {
        throw new Error("Selecione workspace e agente.");
      }
      return agentsApi.adminAssignAgent({
        workspaceId: selectedWorkspace.id,
        agentTemplateId: assignAgentId,
        expiresAt: assignExpiry || undefined
      });
    },
    onSuccess: () => {
      setFeedback("Agente atribuido ao workspace com sucesso!");
      setShowAssignForm(false);
      setAssignAgentId("");
      setAssignExpiry("");
      queryClient.invalidateQueries({ queryKey: ["admin", "workspace-agents", selectedWorkspace?.id] });
    },
    onError: (err) => {
      setFeedback(err instanceof Error ? err.message : "Erro ao atribuir agente.");
    }
  });

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">
          Acesso restrito a administradores.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-0px)]">
        {/* Workspace list */}
        <div className="w-96 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Workspaces
            </h1>
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar workspace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loadingWorkspaces && (
              <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
            )}
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setSelectedWorkspace(ws); setShowAssignForm(false); setFeedback(""); }}
                className={`w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-colors ${
                  selectedWorkspace?.id === ws.id ? "bg-accent/70" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{ws.name}</p>
                    <p className="text-xs text-muted-foreground">Codigo: {ws.code}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {ws._count.members}
                    </div>
                    <div className="flex items-center gap-1">
                      <Bot className="w-3 h-3" /> {ws._count.workspaceAgents}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workspace detail */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {!selectedWorkspace ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Selecione um workspace para gerenciar agentes
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedWorkspace.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Codigo: {selectedWorkspace.code} · {selectedWorkspace._count.members} membro(s)
                  </p>
                </div>
                <Button onClick={() => setShowAssignForm(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Agente
                </Button>
              </div>

              {showAssignForm && (
                <div className="rounded-xl border p-4 space-y-4 bg-card">
                  <h3 className="font-semibold">Adicionar agente ao workspace</h3>

                  <div className="space-y-2">
                    <Label>Qual agente deseja adicionar?</Label>
                    <select
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                      value={assignAgentId}
                      onChange={(e) => setAssignAgentId(e.target.value)}
                    >
                      <option value="">Selecione um agente</option>
                      {publishedTemplates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Validade (data de expiracao)
                    </Label>
                    <Input
                      type="date"
                      value={assignExpiry}
                      onChange={(e) => setAssignExpiry(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para acesso sem data de expiracao.
                      Para 30 dias, selecione a data correspondente.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => assignMutation.mutate()}
                      disabled={assignMutation.isPending || !assignAgentId}
                    >
                      {assignMutation.isPending ? "Atribuindo..." : "Confirmar Atribuicao"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAssignForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {feedback && (
                <p className="text-sm text-primary">{feedback}</p>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Agentes neste Workspace ({workspaceAgents.length})
                </h3>

                {workspaceAgents.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">
                    Nenhum agente atribuido a este workspace.
                  </p>
                )}

                {workspaceAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-lg border p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        agent.isActive ? "bg-green-500/20" : "bg-muted"
                      }`}>
                        <Bot className={`w-5 h-5 ${agent.isActive ? "text-green-400" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{agent.agentTemplate.name}</p>
                        <p className="text-xs text-muted-foreground">
                          v{agent.agentTemplateVersion.version} · {agent.agentTemplate.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {agent.isActive ? (
                          <><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-xs text-green-400">Ativo</span></>
                        ) : (
                          <><XCircle className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Inativo</span></>
                        )}
                      </div>
                      {agent.expiresAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expira: {new Date(agent.expiresAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
