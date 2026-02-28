import { apiFetch } from "./client";

export type ConversationListItem = {
  id: string;
  contactId: string;
  status: string;
  channel: string;
  lastMessageAt: string | null;
  createdAt: string;
  assignedToUserId: string | null;
  contact: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    leadScore?: number | null;
    leadScoreLabel?: string | null;
  };
  assignedToUser?: { id: string; name: string } | null;
  _count?: { messages: number };
};

export type Message = {
  id: string;
  direction: string;
  text: string;
  sentAt: string;
  providerMessageId?: string | null;
  meta?: Record<string, unknown> | null;
};

export type ConversationDetail = ConversationListItem & {
  messages: Message[];
  firstResponseTimeSeconds?: number | null;
  resolutionTimeSeconds?: number | null;
};

export const conversationsApi = {
  list: (params?: { status?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", params.limit.toString());
    const qs = query.toString();
    return apiFetch<ConversationListItem[]>(`/conversations${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) =>
    apiFetch<ConversationDetail>(`/conversations/${id}`),

  sendMessage: (conversationId: string, text: string) =>
    apiFetch<{ id: string }>(`/conversations/${conversationId}/send`, {
      method: "POST",
      body: JSON.stringify({ text })
    }),

  assign: (conversationId: string, assignedToUserId: string | null) =>
    apiFetch(`/conversations/${conversationId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assignedToUserId })
    }),

  close: (conversationId: string) =>
    apiFetch(`/conversations/${conversationId}/close`, { method: "PATCH" }),

  updateStatus: (conversationId: string, status: string) =>
    apiFetch(`/conversations/${conversationId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
};
