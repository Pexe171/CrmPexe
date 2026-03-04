import { useEffect, useRef, useState } from "react";
import { createConversationsSocket, type NewMessagePayload } from "@/lib/socket";
import { useConversationMessagesStore } from "@/stores/conversation-messages";
import { useWhatsappSocketStore } from "@/stores/whatsapp-socket";
import type { Message } from "@/lib/api/conversations";

function toMessage(p: NewMessagePayload["message"]): Message {
  return {
    id: p.id,
    direction: p.direction,
    text: p.text,
    sentAt: p.sentAt,
    providerMessageId: p.providerMessageId ?? null,
    meta: p.meta ?? null
  };
}

/**
 * Connects to the conversations WebSocket when user has workspaceId.
 * Listens for newMessage and appends to the Zustand store for real-time updates.
 */
export function useSocket(workspaceId: string | null, token?: string | null) {
  const socketRef = useRef<ReturnType<typeof createConversationsSocket> | null>(null);
  const [connected, setConnected] = useState(false);
  const appendMessage = useConversationMessagesStore((s) => s.appendMessage);
  const setQr = useWhatsappSocketStore((s) => s.setQr);
  const setConnectedWhatsapp = useWhatsappSocketStore((s) => s.setConnected);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }
    const socket = createConversationsSocket(workspaceId, token);
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("newMessage", (payload: NewMessagePayload) => {
      appendMessage(payload.conversationId, toMessage(payload.message));
    });
    socket.on("whatsapp_qr_update", (data: { accountId: string; qrCodeData: string }) => {
      setQr(data.accountId, data.qrCodeData);
    });
    socket.on("whatsapp_connected", (data: { accountId: string }) => {
      setConnectedWhatsapp(data.accountId);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("newMessage");
      socket.off("whatsapp_qr_update");
      socket.off("whatsapp_connected");
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [workspaceId, token, appendMessage]);

  return { socket: socketRef.current, connected };
}
