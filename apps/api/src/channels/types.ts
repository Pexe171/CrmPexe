export interface ChannelContact {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  externalId?: string | null;
}

export interface ChannelInboundMessage {
  id: string;
  text: string;
  timestamp: Date;
  contact: ChannelContact;
  metadata?: Record<string, unknown>;
}

export interface ChannelSendMessageInput {
  to: string;
  text: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelSendMessageResult {
  providerMessageId: string;
  raw?: unknown;
}
