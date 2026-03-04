import { apiFetch } from "./client";

export type FlowPayload = {
  name?: string;
  nodes: unknown[];
  edges: unknown[];
};

export const automationsApi = {
  saveFlow: (payload: FlowPayload) =>
    apiFetch<{ id: string; name: string }>("/automations/flow", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
