import { apiFetch } from "./client";

export type AgentTemplateListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  category: string | null;
  description?: string | null;
  channel?: string | null;
  iconUrl?: string | null;
  priceLabel?: string | null;
  tags?: string[];
  versions?: Array<{
    id: string;
    version: number;
    publishedAt: string | null;
    requiredVariables?: AgentVariable[] | null;
  }>;
};

export type AgentVariable = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: string;
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

export type AdminWorkspace = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  _count: {
    workspaceAgents: number;
    members: number;
  };
};

export type WorkspaceAgentDetail = {
  id: string;
  workspaceId: string;
  isActive: boolean;
  configJson: Record<string, unknown>;
  activatedAt: string;
  deactivatedAt: string | null;
  expiresAt: string | null;
  agentTemplate: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
  agentTemplateVersion: {
    version: number;
    publishedAt: string | null;
    requiredVariables?: AgentVariable[] | null;
  };
};

export const agentsApi = {
  listTemplates: () =>
    apiFetch<{ data: AgentTemplateListItem[] }>("/agent-templates?perPage=100"),

  getTemplate: (id: string) =>
    apiFetch<AgentTemplateListItem>(`/agent-templates/${id}`),

  importTemplate: (payload: ImportAgentTemplatePayload) =>
    apiFetch<{ templateId: string; version: number; preview: Record<string, unknown> }>("/agent-templates/import", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  publishTemplate: (templateId: string) =>
    apiFetch(`/agent-templates/${templateId}/publish`, { method: "POST" }),

  updateTemplate: (templateId: string, data: Partial<ImportAgentTemplatePayload>) =>
    apiFetch(`/agent-templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  deleteTemplate: (templateId: string) =>
    apiFetch(`/agent-templates/${templateId}`, { method: "DELETE" }),

  catalog: () =>
    apiFetch<WorkspaceAgentCatalogItem[]>("/workspace-agents/catalog"),

  activate: (agentTemplateId: string, configJson?: Record<string, unknown>) =>
    apiFetch(`/workspace-agents/${agentTemplateId}/activate`, {
      method: "POST",
      body: JSON.stringify({ configJson })
    }),

  deactivate: (agentTemplateId: string) =>
    apiFetch(`/workspace-agents/${agentTemplateId}/deactivate`, { method: "POST" }),

  adminListWorkspaces: (search?: string) =>
    apiFetch<AdminWorkspace[]>(`/workspace-agents/admin/workspaces${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  adminGetWorkspaceAgents: (workspaceId: string) =>
    apiFetch<WorkspaceAgentDetail[]>(`/workspace-agents/admin/workspaces/${workspaceId}/agents`),

  adminAssignAgent: (data: {
    workspaceId: string;
    agentTemplateId: string;
    expiresAt?: string;
    configJson?: Record<string, unknown>;
  }) =>
    apiFetch("/workspace-agents/admin/assign", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  listWorkspaceAgents: (isActive?: boolean) =>
    apiFetch<WorkspaceAgentDetail[]>(`/workspace-agents${isActive !== undefined ? `?isActive=${isActive}` : ""}`)
};
