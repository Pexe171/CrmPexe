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

function tryParseJson(value: string) {
  return JSON.parse(value) as Record<string, unknown>;
}

export default function AgentsPage() {
  const { data: me } = useAuthMe();
  const location = useLocation();
  const queryClient = useQueryClient();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [selectedAgentId, setSelectedAgentId] = useState(params.get("agent") ?? "");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(params.get("workspace") ?? "");
  const [configJsonText, setConfigJsonText] = useState("{}");
  const [installLink, setInstallLink] = useState("");
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

  const { data: templatesResponse } = useQuery({
    queryKey: ["agents", "templates"],
    queryFn: agentsApi.listTemplates,
    enabled: isSuperAdminOrAdmin
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ["workspace", "agents", "catalog"],
    queryFn: agentsApi.catalog
  });

  const publishedTemplates = (templatesResponse?.data ?? []).filter(
    (template) => template.status === "PUBLISHED"
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      const payload = tryParseJson(importJsonText);
      if (!importName.trim()) {
        throw new Error("Informe o nome do agente para importação.");
      }
      if (!importCategory.trim()) {
        throw new Error("Informe a categoria do agente.");
      }

      const imported = await agentsApi.importTemplate({
        name: importName.trim(),
        description: importDescription.trim() || undefined,
        category: importCategory.trim(),
        jsonPayload: payload
      });

      await agentsApi.publishTemplate(imported.templateId);
      return imported.templateId;
    },
    onSuccess: async (templateId) => {
      setFeedback("Agente importado do JSON e publicado no n8n com sucesso.");
      setSelectedAgentId(templateId);
      await queryClient.invalidateQueries({ queryKey: ["agents", "templates"] });
      await queryClient.invalidateQueries({ queryKey: ["workspace", "agents", "catalog"] });
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? `Falha ao importar/publicar agente: ${error.message}`
          : "Falha ao importar/publicar agente."
      );
    }
  });

  const installMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentId) {
        throw new Error("Selecione um agente para adicionar.");
      }

      if (!selectedWorkspaceId) {
        throw new Error("Selecione o workspace onde o agente será ativado.");
      }

      if (selectedWorkspaceId !== me?.currentWorkspaceId) {
        await workspacesApi.switchWorkspace(selectedWorkspaceId);
      }

      const config = tryParseJson(configJsonText);
      await agentsApi.activate(selectedAgentId, config);
    },
    onSuccess: () => {
      setFeedback("Agente adicionado com sucesso no workspace selecionado.");
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error ? `Falha ao adicionar agente: ${error.message}` : "Falha ao adicionar agente."
      );
    }
  });

  const handleJsonFileUpload = async (file?: File | null) => {
    if (!file) return;

    const text = await file.text();
    setImportJsonText(text);

    try {
      const parsed = tryParseJson(text);
      const parsedName = typeof parsed.name === "string" ? parsed.name.trim() : "";
      if (parsedName) {
        setImportName(parsedName);
      }
      setFeedback("JSON carregado com sucesso. Revise e publique.");
    } catch {
      setFeedback("Arquivo JSON inválido. Corrija o arquivo e tente novamente.");
    }
  };

  const buildInstallUrl = () => {
    if (!selectedAgentId) {
      setFeedback("Selecione um agente para gerar a URL.");
      return;
    }

    if (!selectedWorkspaceId) {
      setFeedback("Selecione um workspace para gerar a URL.");
      return;
    }

    const search = new URLSearchParams();
    search.set("agent", selectedAgentId);
    search.set("workspace", selectedWorkspaceId);

    const finalUrl = `${window.location.origin}/agents?${search.toString()}`;
    setInstallLink(finalUrl);
    setFeedback("URL criada com sucesso para instalação do agente.");
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Agentes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fluxo real: importar JSON, publicar no n8n e ativar por workspace sem dados fake.
          </p>
        </div>

        {isSuperAdminOrAdmin && (
          <section className="rounded-xl border p-4 space-y-4">
            <h2 className="font-semibold">Super Admin · Importar JSON e publicar no n8n</h2>

            <div className="space-y-2">
              <Label htmlFor="json-file">Arquivo JSON do agente</Label>
              <Input
                id="json-file"
                type="file"
                accept="application/json"
                onChange={(event) => handleJsonFileUpload(event.target.files?.[0])}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="import-name">Nome do agente</Label>
                <Input
                  id="import-name"
                  value={importName}
                  onChange={(event) => setImportName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-category">Categoria</Label>
                <Input
                  id="import-category"
                  value={importCategory}
                  onChange={(event) => setImportCategory(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-description">Descrição</Label>
              <Textarea
                id="import-description"
                value={importDescription}
                onChange={(event) => setImportDescription(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-json">JSON do agente</Label>
              <Textarea
                id="import-json"
                className="min-h-52"
                value={importJsonText}
                onChange={(event) => setImportJsonText(event.target.value)}
              />
            </div>

            <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
              {importMutation.isPending ? "Importando e publicando..." : "Importar JSON e publicar"}
            </Button>
          </section>
        )}

        <section className="rounded-xl border p-4 space-y-4">
          <h2 className="font-semibold">Super Admin · Gerar URL para adicionar agente</h2>

          <div className="space-y-2">
            <Label htmlFor="agent-super">Qual agente publicado?</Label>
            <select
              id="agent-super"
              className="w-full h-10 rounded-md border bg-background px-3"
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
            >
              <option value="">Selecione</option>
              {(isSuperAdminOrAdmin ? publishedTemplates : catalog).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-super">Workspace de destino</Label>
            <select
              id="workspace-super"
              className="w-full h-10 rounded-md border bg-background px-3"
              value={selectedWorkspaceId}
              onChange={(event) => setSelectedWorkspaceId(event.target.value)}
            >
              <option value="">Selecione</option>
              {myWorkspaces.map((workspace) => (
                <option key={workspace.workspaceId} value={workspace.workspaceId}>
                  {workspace.workspaceName} ({workspace.workspaceCode})
                </option>
              ))}
            </select>
          </div>

          <Button onClick={buildInstallUrl}>Gerar URL de instalação</Button>

          {installLink && (
            <div className="space-y-2">
              <Label>URL gerada</Label>
              <Input value={installLink} readOnly />
            </div>
          )}
        </section>

        <section className="rounded-xl border p-4 space-y-4">
          <h2 className="font-semibold">Conta do usuário · Adicionar agente no workspace</h2>

          <div className="space-y-2">
            <Label htmlFor="agent-user">Agente</Label>
            <select
              id="agent-user"
              className="w-full h-10 rounded-md border bg-background px-3"
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
            >
              <option value="">Selecione</option>
              {catalog.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-user">Workspace disponível</Label>
            <select
              id="workspace-user"
              className="w-full h-10 rounded-md border bg-background px-3"
              value={selectedWorkspaceId}
              onChange={(event) => setSelectedWorkspaceId(event.target.value)}
            >
              <option value="">Selecione</option>
              {myWorkspaces.map((workspace) => (
                <option key={workspace.workspaceId} value={workspace.workspaceId}>
                  {workspace.workspaceName} ({workspace.workspaceCode})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vars">Variáveis do agente (JSON)</Label>
            <Textarea
              id="vars"
              value={configJsonText}
              onChange={(event) => setConfigJsonText(event.target.value)}
              className="min-h-32"
            />
          </div>

          <Button onClick={() => installMutation.mutate()} disabled={installMutation.isPending}>
            {installMutation.isPending ? "Adicionando..." : "Adicionar agente"}
          </Button>
        </section>

        {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
      </div>
    </DashboardLayout>
  );
}
