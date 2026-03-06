import { apiFetch } from "./client";

export type MyWorkspace = {
  workspaceId: string;
  workspaceName: string;
  workspaceCode: string;
  role: string;
  status: string;
};

export type WorkspaceTemplate = "blank" | "real_estate" | "agency";

export type CreateWorkspacePayload = {
  name: string;
  password: string;
  template?: WorkspaceTemplate;
};
export type JoinWorkspacePayload = { code: string; password: string };

export type CreateWorkspaceResult = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
};

export type CurrentWorkspace = {
  id: string;
  name: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  customDomain: string | null;
  locale: string;
  pipelineStages?: { id: string; label: string }[] | null;
  createdAt: string;
  updatedAt: string;
};

export const workspacesApi = {
  listMyWorkspaces: () => apiFetch<MyWorkspace[]>("/me/workspaces"),
  getCurrentWorkspace: () => apiFetch<CurrentWorkspace>("/workspaces/current"),
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
