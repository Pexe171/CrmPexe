const apiUrl = "";

export const conversationsPageSize = 20;

export type Conversation = {
  id: string;
  status?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  contact?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    leadScore?: number | null;
    leadScoreLabel?: string | null;
  } | null;
  assignedToUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  _count?: {
    messages?: number | null;
  } | null;
};

export type Message = {
  id: string;
  direction?: "IN" | "OUT" | string | null;
  text?: string | null;
  sentAt?: string | null;
};

export type ConversationDetails = Conversation & {
  messages?: Message[];
};

export type ConversationSummary = {
  id: string;
  conversationId: string;
  text: string;
  bullets: string[];
  createdAt: string;
};

export const fetchConversations = async ({
  page = 1,
  limit = conversationsPageSize,
  signal
}: {
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<Conversation[]> => {
  const response = await fetch(
    `${apiUrl}/api/conversations?page=${page}&limit=${limit}`,
    {
      credentials: "include",
      signal
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar conversas.");
  }

  return (await response.json()) as Conversation[];
};

export const fetchConversationDetails = async (
  conversationId: string,
  signal?: AbortSignal
): Promise<ConversationDetails> => {
  const response = await fetch(
    `${apiUrl}/api/conversations/${conversationId}`,
    {
      credentials: "include",
      signal
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar mensagens.");
  }

  return (await response.json()) as ConversationDetails;
};

export const sendConversationMessage = async ({
  conversationId,
  text,
  signal
}: {
  conversationId: string;
  text: string;
  signal?: AbortSignal;
}): Promise<void> => {
  const response = await fetch(
    `${apiUrl}/api/conversations/${conversationId}/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ text }),
      signal
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível enviar a mensagem.");
  }
};

export const fetchConversationSummary = async (
  conversationId: string,
  signal?: AbortSignal
): Promise<ConversationSummary> => {
  const response = await fetch(
    `${apiUrl}/api/ai/conversations/${conversationId}/summary`,
    {
      method: "POST",
      credentials: "include",
      signal
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível gerar o resumo.");
  }

  return (await response.json()) as ConversationSummary;
};
