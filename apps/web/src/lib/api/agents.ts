import { apiFetch } from "./client";

export type AgentTemplateListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  category: string | null;
  description?: string | null;
};

export type WorkspaceAgentCatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type ImportAgentTemplatePayload = {
  name: string;
  description?: string;
  category: string;
  jsonPayload: Record<string, unknown>;
};

export const agentsApi = {
  listTemplates: () =>
    apiFetch<{ data: AgentTemplateListItem[] }>("/agent-templates?perPage=100"),
  importTemplate: (payload: ImportAgentTemplatePayload) =>
    apiFetch<{ templateId: string; version: number }>("/agent-templates/import", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  publishTemplate: (templateId: string) =>
    apiFetch(`/agent-templates/${templateId}/publish`, {
      method: "POST"
    }),
  catalog: () => apiFetch<WorkspaceAgentCatalogItem[]>("/workspace-agents/catalog"),
  activate: (agentTemplateId: string, configJson?: Record<string, unknown>) =>
    apiFetch(`/workspace-agents/${agentTemplateId}/activate`, {
      method: "POST",
      body: JSON.stringify({ configJson })
    })
};
