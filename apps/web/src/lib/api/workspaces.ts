import { apiFetch } from "./client";

export type MyWorkspace = {
  workspaceId: string;
  workspaceName: string;
  workspaceCode: string;
  role: string;
  status: string;
};

export const workspacesApi = {
  listMyWorkspaces: () => apiFetch<MyWorkspace[]>("/me/workspaces"),
  switchWorkspace: (workspaceId: string) =>
    apiFetch<{ message: string; currentWorkspaceId: string }>(
      `/workspaces/${workspaceId}/switch`,
      { method: "POST" }
    )
};
