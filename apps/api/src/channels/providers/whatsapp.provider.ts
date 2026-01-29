import { BadRequestException, Injectable } from "@nestjs/common";
import { ExternalCallLoggerService } from "../../common/logging/external-call-logger.service";
import { IChannelProvider } from "../interfaces/channel-provider.interface";
import {
  ChannelContact,
  ChannelInboundMessage,
  ChannelIntegration,
  ChannelSendMessageInput,
  ChannelSendMessageResult
} from "../types";

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

  constructor(private readonly externalCallLogger: ExternalCallLoggerService) {}

  async sendMessage(input: ChannelSendMessageInput, integration: ChannelIntegration): Promise<ChannelSendMessageResult> {
    const apiUrl = integration.secrets.apiUrl;
    const apiToken = integration.secrets.apiToken;

    if (!apiUrl || !apiToken) {
      throw new BadRequestException("Integração do WhatsApp sem apiUrl ou apiToken.");
    }

    const payload = {
      to: input.to,
      text: input.text,
      template: input.template
        ? {
            name: input.template.name,
            language: input.template.language,
            parameters: input.template.parameters ?? []
          }
        : undefined,
      metadata: input.metadata ?? undefined
    };

    const start = Date.now();
    let status: number | undefined;
    let errorMessage: string | undefined;
    let responseBody: { id?: string } | undefined;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`
        },
        body: JSON.stringify(payload)
      });

      status = response.status;

      if (!response.ok) {
        const errorBody = await response.text();
        errorMessage = errorBody;
        throw new BadRequestException(`Falha ao enviar WhatsApp: ${errorBody}`);
      }

      responseBody = (await response.json()) as { id?: string };
    } catch (error) {
      if (error instanceof Error && !errorMessage) {
        errorMessage = error.message;
      }
      throw error;
    } finally {
      this.externalCallLogger.log({
        system: "whatsapp",
        operation: "sendMessage",
        method: "POST",
        url: apiUrl,
        status,
        durationMs: Date.now() - start,
        success: !errorMessage,
        workspaceId: integration.workspaceId,
        errorMessage
      });
    }

    return {
      providerMessageId: responseBody?.id ?? `wa_${Date.now()}`,
      raw: responseBody
    };
  }

  async receiveWebhook(
    payload: unknown,
    _headers: Record<string, string>,
    _integration: ChannelIntegration
  ): Promise<ChannelInboundMessage[]> {
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

  async verifyWebhook(
    _payload: unknown,
    headers: Record<string, string>,
    integration: ChannelIntegration
  ): Promise<boolean> {
    const expectedToken = integration.secrets.webhookToken;
    if (!expectedToken) {
      return true;
    }
    const headerToken = headers["x-whatsapp-token"] ?? headers["x-webhook-token"];
    return headerToken === expectedToken;
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
