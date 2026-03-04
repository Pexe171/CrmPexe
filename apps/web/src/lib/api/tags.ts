import { apiFetch } from "./client";

export type Tag = {
  id: string;
  name: string;
  color: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const tagsApi = {
  list: () => apiFetch<Tag[]>("/tags"),
  create: (payload: { name: string; color?: string | null }) =>
    apiFetch<Tag>("/tags", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: { name?: string; color?: string | null }) =>
    apiFetch<Tag>(`/tags/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  delete: (id: string) => apiFetch(`/tags/${id}`, { method: "DELETE" })
};
