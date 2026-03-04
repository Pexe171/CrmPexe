import { apiFetch } from "./client";

export type Queue = {
  id: string;
  name: string;
  channel: string;
  teamId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const queuesApi = {
  list: () => apiFetch<Queue[]>("/queues"),
  create: (payload: { name: string; channel: string; teamId: string; isActive?: boolean }) =>
    apiFetch<Queue>("/queues", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: { name?: string; channel?: string; teamId?: string; isActive?: boolean }) =>
    apiFetch<Queue>(`/queues/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  delete: (id: string) => apiFetch(`/queues/${id}`, { method: "DELETE" })
};
