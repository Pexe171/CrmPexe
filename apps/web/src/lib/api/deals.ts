import { apiFetch } from "./client";

export type Deal = {
  id: string;
  workspaceId: string;
  title: string;
  amount: number | null;
  stage: string | null;
  contactId: string | null;
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export const dealsApi = {
  list: () => apiFetch<Deal[]>("/deals"),
  create: (payload: { title: string; stage?: string; amount?: number; contactId?: string }) =>
    apiFetch<Deal>("/deals", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateStage: (dealId: string, stage: string) =>
    apiFetch<Deal>(`/deals/${dealId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage })
    })
};
