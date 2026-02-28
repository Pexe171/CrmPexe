import { apiFetch } from "./client";

export type IntegrationAccount = {
  id: string;
  workspaceId: string;
  type: string;
  name: string;
  status: string;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WhatsappQrResponse = {
  qr: string | null;
  status: string;
  needsSupport?: boolean;
  message?: string;
  supportContactUrl?: string | null;
};

export type WhatsappSession = {
  id: string;
  integrationAccountId: string;
  profileUserId: string;
  provider: string;
  sessionName: string;
  status: string;
  qrCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export const integrationsApi = {
  listAccounts: () =>
    apiFetch<IntegrationAccount[]>("/integration-accounts"),

  createAccount: (data: { name: string; type: string; status?: string }) =>
    apiFetch<IntegrationAccount>("/integration-accounts", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  deleteAccount: (id: string) =>
    apiFetch(`/integration-accounts/${id}`, { method: "DELETE" }),

  upsertSecret: (id: string, payload: Record<string, string>) =>
    apiFetch(`/integration-accounts/${id}/secret`, {
      method: "PUT",
      body: JSON.stringify({ payload })
    }),

  requestWhatsappQr: (id: string) =>
    apiFetch<WhatsappQrResponse>(`/integration-accounts/${id}/whatsapp/qr`, {
      method: "POST"
    }),

  getWhatsappStatus: (id: string) =>
    apiFetch<WhatsappQrResponse>(`/integration-accounts/${id}/whatsapp/status`),

  listWhatsappSessions: (id: string) =>
    apiFetch<WhatsappSession[]>(`/integration-accounts/${id}/whatsapp/sessions`),

  connectEvolution: (id: string) =>
    apiFetch<WhatsappQrResponse>(`/integration-accounts/${id}/whatsapp/evolution/connect`, {
      method: "POST"
    })
};
