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

export interface ChannelIntegration {
  id: string;
  provider: string;
  secrets: Record<string, string>;
}

export interface ChannelSendMessageTemplate {
  name: string;
  language: string;
  parameters?: string[];
}

export interface ChannelSendMessageInput {
  to: string;
  text: string;
  template?: ChannelSendMessageTemplate;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelSendMessageResult {
  providerMessageId: string;
  raw?: unknown;
}
