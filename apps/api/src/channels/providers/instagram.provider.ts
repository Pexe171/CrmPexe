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

type InstagramWebhookPayload = {
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
export class InstagramProvider implements IChannelProvider {
  readonly channel = "instagram";

  constructor(private readonly externalCallLogger: ExternalCallLoggerService) {}

  async sendMessage(
    input: ChannelSendMessageInput,
    integration: ChannelIntegration
  ): Promise<ChannelSendMessageResult> {
    const apiUrl = integration.secrets.apiUrl;
    const apiToken = integration.secrets.apiToken;

    if (!apiUrl || !apiToken) {
      throw new BadRequestException(
        "Integração do Instagram sem apiUrl ou apiToken. Configure a Evolution API para Instagram."
      );
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
        : undefined
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
        throw new BadRequestException(`Falha ao enviar Instagram: ${errorBody}`);
      }

      responseBody = (await response.json()) as { id?: string };
    } catch (error) {
      if (error instanceof Error && !errorMessage) {
        errorMessage = error.message;
      }
      throw error;
    } finally {
      this.externalCallLogger.log({
        system: "instagram",
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
      providerMessageId: responseBody?.id ?? `ig_${Date.now()}`,
      raw: responseBody
    };
  }

  async receiveWebhook(
    payload: unknown,
    _headers: Record<string, string>,
    _integration: ChannelIntegration
  ): Promise<ChannelInboundMessage[]> {
    const data = payload as InstagramWebhookPayload;
    if (!data?.messages || !Array.isArray(data.messages)) {
      return [];
    }

    return data.messages
      .filter((message) => message?.text && message?.from)
      .map((message) => ({
        id: message.id ?? `ig_${Date.now()}_${message.from}`,
        text: message.text ?? "",
        timestamp: this.parseTimestamp(message.timestamp),
        contact: {
          name: message.contactName ?? undefined,
          email: message.contactEmail ?? undefined,
          externalId: message.from ?? undefined
        },
        metadata: { raw: message }
      }));
  }

  async verifyWebhook(
    _payload: unknown,
    headers: Record<string, string>,
    integration: ChannelIntegration
  ): Promise<boolean> {
    const webhookSecret = integration.secrets.webhookSecret?.trim();
    if (!webhookSecret) {
      return true;
    }
    const signature =
      headers["x-instagram-signature"] ??
      headers["x-webhook-signature"] ??
      headers["x-signature"];
    return Boolean(signature && signature === webhookSecret);
  }

  mapInboundToContact(message: ChannelInboundMessage): ChannelContact {
    return {
      name: message.contact.name ?? "Contato Instagram",
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
