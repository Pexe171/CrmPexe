import { BadRequestException, Injectable } from "@nestjs/common";
import { IChannelProvider } from "../interfaces/channel-provider.interface";
import {
  ChannelContact,
  ChannelInboundMessage,
  ChannelIntegration,
  ChannelSendMessageInput,
  ChannelSendMessageResult
} from "../types";

type GenericWebhookPayload = {
  messages?: Array<{
    id?: string;
    text?: string;
    from?: string;
    timestamp?: string | number;
    contactName?: string;
    contactEmail?: string;
  }>;
};

@Injectable()
export class MockOmnichannelProvider implements IChannelProvider {
  readonly channel = "instagram";

  async sendMessage(
    input: ChannelSendMessageInput,
    integration: ChannelIntegration
  ): Promise<ChannelSendMessageResult> {
    if (!integration.secrets.apiToken) {
      throw new BadRequestException(
        "Integração omnichannel sem apiToken configurado."
      );
    }

    return {
      providerMessageId: `mock_${Date.now()}`,
      raw: {
        sent: true,
        to: input.to,
        channel: this.channel
      }
    };
  }

  async receiveWebhook(
    payload: unknown,
    _headers: Record<string, string>,
    _integration: ChannelIntegration
  ): Promise<ChannelInboundMessage[]> {
    const data = payload as GenericWebhookPayload;
    if (!Array.isArray(data?.messages)) {
      return [];
    }

    return data.messages
      .filter((message) => message?.text && message?.from)
      .map((message) => ({
        id: message.id ?? `omni_${Date.now()}_${message.from}`,
        text: message.text ?? "",
        timestamp: this.parseTimestamp(message.timestamp),
        contact: {
          name: message.contactName ?? undefined,
          email: message.contactEmail ?? undefined,
          externalId: message.from ?? undefined
        },
        metadata: {
          raw: message,
          provider: "mock-omnichannel"
        }
      }));
  }

  async verifyWebhook(
    _payload: unknown,
    headers: Record<string, string>,
    integration: ChannelIntegration
  ): Promise<boolean> {
    const webhookSecret = integration.secrets.webhookSecret?.trim();
    if (!webhookSecret) {
      return false;
    }

    const signature = headers["x-omnichannel-signature"]?.trim();
    return Boolean(signature && signature === webhookSecret);
  }

  mapInboundToContact(message: ChannelInboundMessage): ChannelContact {
    return {
      name: message.contact.name ?? "Contato Omnichannel",
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
