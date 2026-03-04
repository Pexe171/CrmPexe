import { create } from "zustand";
import type { Message } from "@/lib/api/conversations";

type ConversationMessagesState = {
  /** conversationId -> list of messages appended in real time (only new ones from socket) */
  pendingByConversation: Record<string, Message[]>;
  appendMessage: (conversationId: string, message: Message) => void;
  clearPending: (conversationId: string) => void;
};

export const useConversationMessagesStore = create<ConversationMessagesState>((set) => ({
  pendingByConversation: {},
  appendMessage: (conversationId, message) =>
    set((state) => {
      const list = state.pendingByConversation[conversationId] ?? [];
      if (list.some((m) => m.id === message.id)) return state;
      return {
        pendingByConversation: {
          ...state.pendingByConversation,
          [conversationId]: [...list, message]
        }
      };
    }),
  clearPending: (conversationId) =>
    set((state) => {
      const next = { ...state.pendingByConversation };
      delete next[conversationId];
      return { pendingByConversation: next };
    })
}));
