import { apiFetch } from "./client";

export type MyWorkspace = {
  workspaceId: string;
  workspaceName: string;
  workspaceCode: string;
  role: string;
  status: string;
};

export type CreateWorkspacePayload = { name: string; password: string };
export type JoinWorkspacePayload = { code: string; password: string };

export type CreateWorkspaceResult = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
};

export const workspacesApi = {
  listMyWorkspaces: () => apiFetch<MyWorkspace[]>("/me/workspaces"),
  createWorkspace: (payload: CreateWorkspacePayload) =>
    apiFetch<CreateWorkspaceResult>("/workspaces", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  joinWorkspace: (payload: JoinWorkspacePayload) =>
    apiFetch<{ id: string; workspaceId: string; status: string }>("/workspaces/join", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  switchWorkspace: (workspaceId: string) =>
    apiFetch<{ message: string; currentWorkspaceId: string }>(
      `/workspaces/${workspaceId}/switch`,
      { method: "POST" }
    )
};
