import { BadRequestException, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { createTransport } from "nodemailer";
import { ExternalCallLoggerService } from "../../common/logging/external-call-logger.service";
import { IChannelProvider } from "../interfaces/channel-provider.interface";
import {
  ChannelContact,
  ChannelInboundMessage,
  ChannelIntegration,
  ChannelSendMessageInput,
  ChannelSendMessageResult
} from "../types";

type EmailWebhookPayload = {
  messages?: Array<{
    id?: string;
    text?: string;
    html?: string;
    from?: string;
    fromName?: string;
    timestamp?: string | number;
    subject?: string;
  }>;
};

@Injectable()
export class EmailProvider implements IChannelProvider {
  readonly channel = "email";

  constructor(private readonly externalCallLogger: ExternalCallLoggerService) {}

  async sendMessage(
    input: ChannelSendMessageInput,
    integration: ChannelIntegration
  ): Promise<ChannelSendMessageResult> {
    const host = integration.secrets.smtpHost ?? process.env.SMTP_HOST;
    const port = Number(integration.secrets.smtpPort ?? process.env.SMTP_PORT ?? 465);
    const user = integration.secrets.smtpUser ?? process.env.SMTP_USER;
    const pass = integration.secrets.smtpPass ?? process.env.SMTP_PASS;
    const from = integration.secrets.smtpFrom ?? process.env.SMTP_FROM;
    const secure = String(
      integration.secrets.smtpSecure ?? process.env.SMTP_SECURE ?? port === 465
    ).toLowerCase() !== "false";

    if (!host || !user || !pass || !from || !input.to) {
      throw new BadRequestException(
        "Configuração de e-mail incompleta (smtpHost, smtpUser, smtpPass, smtpFrom e destinatário são obrigatórios)."
      );
    }

    const transporter = createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    const start = Date.now();
    let status: number | string | undefined;
    let errorMessage: string | undefined;

    try {
      const info = await transporter.sendMail({
        from,
        to: input.to,
        subject: input.metadata?.subject ? String(input.metadata.subject) : "Mensagem CrmPexe",
        text: input.text,
        html: input.metadata?.html ? String(input.metadata.html) : undefined,
        replyTo: input.metadata?.replyTo ? String(input.metadata.replyTo) : undefined
      });

      status = "sent";

      return {
        providerMessageId: info.messageId ?? `email_${Date.now()}`,
        raw: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response
        }
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      status = "error";
      throw new BadRequestException(`Falha ao enviar e-mail: ${errorMessage}`);
    } finally {
      this.externalCallLogger.log({
        system: "email",
        operation: "sendEmail",
        method: "SMTP",
        url: `${host}:${port}`,
        status,
        durationMs: Date.now() - start,
        success: !errorMessage,
        workspaceId: integration.workspaceId,
        errorMessage
      });
    }
  }

  async receiveWebhook(
    payload: unknown,
    _headers: Record<string, string>,
    _integration: ChannelIntegration
  ): Promise<ChannelInboundMessage[]> {
    const data = payload as EmailWebhookPayload;
    if (!Array.isArray(data?.messages)) {
      return [];
    }

    return data.messages
      .filter((message) => (message?.text || message?.html) && message?.from)
      .map((message) => ({
        id: message.id ?? `email_${Date.now()}`,
        text: message.text ?? message.html ?? "",
        timestamp: this.parseTimestamp(message.timestamp),
        contact: {
          name: message.fromName ?? undefined,
          email: message.from ?? undefined,
          externalId: message.from ?? undefined
        },
        metadata: {
          subject: message.subject,
          raw: message,
          provider: "smtp"
        }
      }));
  }

  async verifyWebhook(
    payload: unknown,
    headers: Record<string, string>,
    integration: ChannelIntegration
  ): Promise<boolean> {
    const webhookSecret = integration.secrets.webhookSecret?.trim();
    if (!webhookSecret) {
      return false;
    }

    const signatureHeader = (process.env.EMAIL_WEBHOOK_SIGNATURE_HEADER?.trim().toLowerCase() ?? "x-email-signature");
    const signature = headers[signatureHeader]?.trim();
    if (!signature) {
      return false;
    }

    const expectedSignature = createHmac("sha256", webhookSecret)
      .update(JSON.stringify(payload ?? {}))
      .digest("hex");

    const normalizedSignature = signature.replace(/^sha256=/i, "");
    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(normalizedSignature);

    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  }

  mapInboundToContact(message: ChannelInboundMessage): ChannelContact {
    return {
      name: message.contact.name ?? "Contato E-mail",
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
