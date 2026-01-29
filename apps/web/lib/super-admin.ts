export type WorkspaceUsage = {
  mensagens: number;
  automacoes: number;
};

export type WorkspaceOverview = {
  id: string;
  name: string;
  status: string;
  plano: string;
  uso: WorkspaceUsage;
  createdAt: string;
  updatedAt: string;
  updatedAtPlano: string | null;
};

export type ErrorLogSummary = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  action: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
};

export type SupportImpersonationResponse = {
  token: string;
  expiresAt: string;
  workspaceId: string;
  targetUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const fetchSuperAdminWorkspaces = async (
  signal?: AbortSignal
): Promise<PaginatedResponse<WorkspaceOverview>> => {
  const response = await fetch(`${apiUrl}/api/super-admin/workspaces`, {
    credentials: "include",
    signal
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os workspaces do super admin.");
  }

  return (await response.json()) as PaginatedResponse<WorkspaceOverview>;
};

export const fetchSuperAdminErrorLogs = async (
  signal?: AbortSignal
): Promise<PaginatedResponse<ErrorLogSummary>> => {
  const response = await fetch(`${apiUrl}/api/super-admin/error-logs`, {
    credentials: "include",
    signal
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os logs de erro.");
  }

  return (await response.json()) as PaginatedResponse<ErrorLogSummary>;
};

export const createSupportImpersonation = async (
  workspaceId: string
): Promise<SupportImpersonationResponse> => {
  const response = await fetch(`${apiUrl}/api/super-admin/workspaces/${workspaceId}/impersonate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error("Não foi possível gerar o token de suporte.");
  }

  return (await response.json()) as SupportImpersonationResponse;
};
