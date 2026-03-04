export const CONVERSATION_NEW_MESSAGE = "conversation.newMessage";

export type NewMessagePayload = {
  workspaceId: string;
  conversationId: string;
  message: {
    id: string;
    direction: string;
    text: string;
    sentAt: string;
    providerMessageId?: string | null;
    meta?: Record<string, unknown> | null;
  };
};
