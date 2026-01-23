import { Injectable } from "@nestjs/common";
import { IChannelProvider } from "../interfaces/channel-provider.interface";
import { ChannelContact, ChannelInboundMessage, ChannelSendMessageInput, ChannelSendMessageResult } from "../types";

type WhatsappWebhookPayload = {
  messages?: Array<{
    id?: string;
    text?: string;
    from?: string;
    timestamp?: string | number;
    contactName?: string;
  }>;
};

@Injectable()
export class WhatsappProvider implements IChannelProvider {
  readonly channel = "whatsapp";

  async sendMessage(input: ChannelSendMessageInput): Promise<ChannelSendMessageResult> {
    return {
      providerMessageId: `wa_${Date.now()}`,
      raw: {
        to: input.to,
        text: input.text,
        metadata: input.metadata ?? {}
      }
    };
  }

  async receiveWebhook(payload: unknown, _headers: Record<string, string>): Promise<ChannelInboundMessage[]> {
    const data = payload as WhatsappWebhookPayload;
    if (!data?.messages || !Array.isArray(data.messages)) {
      return [];
    }

    return data.messages
      .filter((message) => message?.text && message?.from)
      .map((message) => ({
        id: message.id ?? `wa_${Date.now()}_${message.from}`,
        text: message.text ?? "",
        timestamp: this.parseTimestamp(message.timestamp),
        contact: {
          name: message.contactName ?? undefined,
          phone: message.from ?? undefined
        },
        metadata: {
          raw: message
        }
      }));
  }

  async verifyWebhook(_payload: unknown, _headers: Record<string, string>): Promise<boolean> {
    return true;
  }

  mapInboundToContact(message: ChannelInboundMessage): ChannelContact {
    return {
      name: message.contact.name ?? "Contato WhatsApp",
      phone: message.contact.phone ?? undefined,
      email: message.contact.email ?? undefined,
      externalId: message.contact.externalId ?? undefined
    };
  }

  private parseTimestamp(timestamp?: string | number) {
    if (timestamp === undefined || timestamp === null) {
      return new Date();
    }
    const value = typeof timestamp === "number" ? timestamp : Number(timestamp);
    if (Number.isNaN(value)) {
      return new Date();
    }
    return new Date(value * 1000);
  }
}
