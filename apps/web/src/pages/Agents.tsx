import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api/agents";
import { workspacesApi } from "@/lib/api/workspaces";
import type { AgentTemplateListItem, AgentVariable } from "@/lib/api/agents";
import {
  Bot, Upload, Trash2, Eye, Plug, Key, Globe, FileText,
  AlertCircle, CheckCircle, Package, Send
} from "lucide-react";

function tryParseJson(value: string) {
  return JSON.parse(value) as Record<string, unknown>;
}

function VariableBadge({ variable }: { variable: AgentVariable }) {
  const icons: Record<string, typeof Key> = {
    secret: Key,
    url: Globe,
    select: Package,
    text: FileText,
  };
  const Icon = icons[variable.type] ?? FileText;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs bg-card">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="font-mono">{variable.key}</span>
      <span className="text-muted-foreground">({variable.label})</span>
      {variable.required && <span className="text-destructive">*</span>}
    </div>
  );
}

function AgentCard({
  agent,
  onView,
  onDelete,
  isAdmin,
}: {
  agent: AgentTemplateListItem;
  onView: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const latestVersion = agent.versions?.[0];
  const variables = (latestVersion?.requiredVariables ?? []) as AgentVariable[];

  return (
    <div className="rounded-xl border p-4 space-y-3 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            agent.status === "PUBLISHED" ? "bg-green-500/20" : agent.status === "DRAFT" ? "bg-yellow-500/20" : "bg-muted"
          }`}>
            <Bot className={`w-5 h-5 ${
              agent.status === "PUBLISHED" ? "text-green-400" : agent.status === "DRAFT" ? "text-yellow-400" : "text-muted-foreground"
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <p className="text-xs text-muted-foreground">
              {agent.category} · {agent.channel ?? "OMNICHANNEL"}
              {latestVersion && ` · v${latestVersion.version}`}
            </p>
          </div>
        </div>

        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          agent.status === "PUBLISHED"
            ? "border-green-500/30 text-green-400"
            : agent.status === "DRAFT"
            ? "border-yellow-500/30 text-yellow-400"
            : "border-border text-muted-foreground"
        }`}>
          {agent.status === "PUBLISHED" ? "Publicado" : agent.status === "DRAFT" ? "Rascunho" : "Arquivado"}
        </span>
      </div>

      {agent.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
      )}

      {variables.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <Plug className="w-3 h-3" /> Variaveis necessarias ({variables.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {variables.slice(0, 5).map((v) => (
              <VariableBadge key={v.key} variable={v} />
            ))}
            {variables.length > 5 && (
              <span className="text-xs text-muted-foreground px-2 py-1.5">
                +{variables.length - 5} mais
              </span>
            )}
          </div>
        </div>
      )}

      {(agent.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.tags?.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onView} className="gap-1 text-xs">
            <Eye className="w-3 h-3" /> Detalhes
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="gap-1 text-xs text-destructive hover:text-destructive">
            <Trash2 className="w-3 h-3" /> Excluir
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const { data: me } = useAuthMe();
  const location = useLocation();
  const queryClient = useQueryClient();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [tab, setTab] = useState<"list" | "import" | "marketplace">(
    params.get("agent") ? "marketplace" : "list"
  );

  const [selectedAgentId, setSelectedAgentId] = useState(params.get("agent") ?? "");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(params.get("workspace") ?? "");
  const [configJsonText, setConfigJsonText] = useState("{}");
  const [feedback, setFeedback] = useState("");

  const [importName, setImportName] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importCategory, setImportCategory] = useState("in8n");
  const [importJsonText, setImportJsonText] = useState("{}");

  const isSuperAdminOrAdmin = Boolean(me?.isSuperAdmin || me?.role === "ADMIN");

  const { data: myWorkspaces = [] } = useQuery({
    queryKey: ["me", "workspaces"],
    queryFn: workspacesApi.listMyWorkspaces
  });

  const { data: templatesResponse, isLoading: loadingTemplates } = useQuery({
    queryKey: ["agents", "templates"],
    queryFn: agentsApi.listTemplates,
    enabled: isSuperAdminOrAdmin
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ["workspace", "agents", "catalog"],
    queryFn: agentsApi.catalog
  });

  const allTemplates = templatesResponse?.data ?? [];
  const publishedTemplates = allTemplates.filter((t) => t.status === "PUBLISHED");

  const importMutation = useMutation({
    mutationFn: async () => {
      const payload = tryParseJson(importJsonText);
      if (!importName.trim()) throw new Error("Informe o nome do agente.");
      if (!importCategory.trim()) throw new Error("Informe a categoria.");

      const imported = await agentsApi.importTemplate({
        name: importName.trim(),
        description: importDescription.trim() || undefined,
        category: importCategory.trim(),
        jsonPayload: payload
      });

      await agentsApi.publishTemplate(imported.templateId);
      return imported;
    },
    onSuccess: async () => {
      setFeedback("Agente importado e publicado com sucesso!");
      setImportName("");
      setImportDescription("");
      setImportJsonText("{}");
      setTab("list");
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (err) => {
      setFeedback(err instanceof Error ? `Erro: ${err.message}` : "Erro ao importar.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsApi.deleteTemplate(id),
    onSuccess: async () => {
      setFeedback("Agente excluido.");
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (err) => {
      setFeedback(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  });

  const installMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentId) throw new Error("Selecione um agente.");
      if (!selectedWorkspaceId) throw new Error("Selecione um workspace.");
      if (selectedWorkspaceId !== me?.currentWorkspaceId) {
        await workspacesApi.switchWorkspace(selectedWorkspaceId);
      }
      const config = tryParseJson(configJsonText);
      await agentsApi.activate(selectedAgentId, config);
    },
    onSuccess: () => setFeedback("Agente adicionado com sucesso!"),
    onError: (err) => setFeedback(err instanceof Error ? err.message : "Erro ao adicionar.")
  });

  const handleJsonFileUpload = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    setImportJsonText(text);
    try {
      const parsed = tryParseJson(text);
      if (typeof parsed.name === "string" && parsed.name.trim()) setImportName(parsed.name.trim());
      setFeedback("JSON carregado. Revise os dados e publique.");
    } catch {
      setFeedback("Arquivo JSON invalido.");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestao de Agentes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Importe, publique e gerencie agentes de IA integrados ao n8n.
            </p>
          </div>
        </div>

        {/* Tabs */}
        {isSuperAdminOrAdmin && (
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {[
              { key: "list" as const, label: "Agentes", icon: Bot },
              { key: "import" as const, label: "Importar JSON", icon: Upload },
              { key: "marketplace" as const, label: "Adicionar ao Workspace", icon: Send },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setFeedback(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                  tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {feedback && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
            feedback.startsWith("Erro") || feedback.startsWith("Falha")
              ? "border-destructive/30 text-destructive bg-destructive/5"
              : "border-primary/30 text-primary bg-primary/5"
          }`}>
            {feedback.startsWith("Erro") || feedback.startsWith("Falha")
              ? <AlertCircle className="w-4 h-4 shrink-0" />
              : <CheckCircle className="w-4 h-4 shrink-0" />}
            {feedback}
          </div>
        )}

        {/* Tab: Agent List */}
        {tab === "list" && isSuperAdminOrAdmin && (
          <div className="space-y-4">
            {loadingTemplates && <p className="text-sm text-muted-foreground">Carregando agentes...</p>}

            {allTemplates.length === 0 && !loadingTemplates && (
              <div className="text-center py-12 border rounded-xl">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhum agente cadastrado.</p>
                <Button className="mt-4" onClick={() => setTab("import")}>
                  <Upload className="w-4 h-4 mr-2" /> Importar primeiro agente
                </Button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {allTemplates.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isAdmin={isSuperAdminOrAdmin}
                  onView={() => setFeedback(`Detalhes do agente: ${agent.name} (${agent.slug})`)}
                  onDelete={() => {
                    if (confirm(`Tem certeza que deseja excluir "${agent.name}"?`)) {
                      deleteMutation.mutate(agent.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab: Import JSON */}
        {tab === "import" && isSuperAdminOrAdmin && (
          <section className="rounded-xl border p-6 space-y-4 bg-card">
            <h2 className="font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" /> Importar JSON do n8n e publicar
            </h2>

            <div className="space-y-2">
              <Label htmlFor="json-file">Arquivo JSON do agente</Label>
              <Input
                id="json-file"
                type="file"
                accept="application/json"
                onChange={(e) => handleJsonFileUpload(e.target.files?.[0])}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do agente</Label>
                <Input value={importName} onChange={(e) => setImportName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={importCategory} onChange={(e) => setImportCategory(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea value={importDescription} onChange={(e) => setImportDescription(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>JSON do agente</Label>
              <Textarea className="min-h-52 font-mono text-xs" value={importJsonText} onChange={(e) => setImportJsonText(e.target.value)} />
            </div>

            <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="gap-2">
              <Upload className="w-4 h-4" />
              {importMutation.isPending ? "Importando e publicando..." : "Importar JSON e publicar"}
            </Button>
          </section>
        )}

        {/* Tab: Add to Workspace (user or admin) */}
        {tab === "marketplace" && (
          <section className="rounded-xl border p-6 space-y-4 bg-card">
            <h2 className="font-semibold flex items-center gap-2">
              <Send className="w-5 h-5" /> Adicionar agente no workspace
            </h2>

            <div className="space-y-2">
              <Label>Agente</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">Selecione</option>
                {(isSuperAdminOrAdmin ? publishedTemplates : catalog).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Workspace</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              >
                <option value="">Selecione</option>
                {myWorkspaces.map((ws) => (
                  <option key={ws.workspaceId} value={ws.workspaceId}>
                    {ws.workspaceName} ({ws.workspaceCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Variaveis do agente (JSON)</Label>
              <Textarea
                value={configJsonText}
                onChange={(e) => setConfigJsonText(e.target.value)}
                className="min-h-32 font-mono text-xs"
                placeholder='{"OPENAI_API_KEY": "sk-...", "OPENAI_MODEL": "your-model-name"}'
              />
            </div>

            <Button onClick={() => installMutation.mutate()} disabled={installMutation.isPending} className="gap-2">
              <Bot className="w-4 h-4" />
              {installMutation.isPending ? "Adicionando..." : "Adicionar agente"}
            </Button>
          </section>
        )}

        {/* Marketplace for regular users */}
        {!isSuperAdminOrAdmin && (
          <div className="space-y-4">
            <h2 className="font-semibold">Agentes Disponiveis</h2>
            {catalog.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum agente disponivel no momento.
              </p>
            )}
            {catalog.map((agent) => (
              <div key={agent.id} className="rounded-xl border p-4 flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{agent.name}</p>
                    {agent.description && <p className="text-xs text-muted-foreground">{agent.description}</p>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    setTab("marketplace");
                  }}
                >
                  Tenho interesse
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
