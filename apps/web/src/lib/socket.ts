import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api/config";

function getSocketOrigin(): string {
  if (typeof window === "undefined") return "http://localhost:3001";
  try {
    if (API_BASE_URL.startsWith("http")) {
      return new URL(API_BASE_URL).origin;
    }
    return window.location.origin;
  } catch {
    return window.location.origin;
  }
}

export type NewMessagePayload = {
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

export function createConversationsSocket(workspaceId: string, token?: string | null): Socket {
  const origin = getSocketOrigin();
  return io(`${origin}/conversations`, {
    path: "/socket.io",
    auth: {
      workspaceId,
      token: token ?? undefined
    },
    transports: ["websocket", "polling"]
  });
}
