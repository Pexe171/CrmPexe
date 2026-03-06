import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { OnEvent } from "@nestjs/event-emitter";
import { Server } from "socket.io";
import { CONVERSATION_NEW_MESSAGE, NewMessagePayload } from "./events/new-message.event";

const WS_NAMESPACE = "conversations";

@WebSocketGateway({
  namespace: WS_NAMESPACE
  // CORS is applied at server level via CorsIoAdapter (CORS_ORIGIN env)
})
export class ConversationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: { handshake: { query?: { workspaceId?: string }; auth?: { workspaceId?: string } }; join: (room: string) => void }) {
    const workspaceId =
      client.handshake?.query?.workspaceId ||
      client.handshake?.auth?.workspaceId;
    if (workspaceId && typeof workspaceId === "string") {
      const room = `workspace:${workspaceId.trim()}`;
      client.join(room);
    }
  }

  handleDisconnect() {
    // optional: cleanup
  }

  @OnEvent(CONVERSATION_NEW_MESSAGE)
  handleNewMessage(payload: NewMessagePayload) {
    const room = `workspace:${payload.workspaceId}`;
    this.server.to(room).emit("newMessage", {
      conversationId: payload.conversationId,
      message: payload.message
    });
  }

  @OnEvent("whatsapp.qr_update")
  handleWhatsappQrUpdate(payload: { workspaceId: string; accountId: string; qrCodeData: string }) {
    const room = `workspace:${payload.workspaceId}`;
    this.server.to(room).emit("whatsapp_qr_update", {
      accountId: payload.accountId,
      qrCodeData: payload.qrCodeData
    });
  }

  @OnEvent("whatsapp.connected")
  handleWhatsappConnected(payload: { workspaceId: string; accountId: string }) {
    const room = `workspace:${payload.workspaceId}`;
    this.server.to(room).emit("whatsapp_connected", {
      accountId: payload.accountId
    });
  }
}
