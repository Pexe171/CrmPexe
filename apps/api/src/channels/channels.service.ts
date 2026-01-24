import { BadRequestException, Injectable } from "@nestjs/common";
import { IntegrationAccountType, IntegrationAccountStatus, MessageDirection, NotificationType, Prisma } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { IntegrationCryptoService } from "../integration-accounts/integration-crypto.service";
import { AutomationEngineService } from "../automation-engine/automation-engine.service";
import { IChannelProvider } from "./interfaces/channel-provider.interface";
import { WhatsappProvider } from "./providers/whatsapp.provider";
import { ChannelInboundMessage, ChannelContact, ChannelIntegration, ChannelSendMessageInput } from "./types";

@Injectable()
export class ChannelsService {
  private readonly providers = new Map<string, IChannelProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly integrationCryptoService: IntegrationCryptoService,
    private readonly automationEngineService: AutomationEngineService,
    whatsappProvider: WhatsappProvider
  ) {
    this.providers.set(whatsappProvider.channel, whatsappProvider);
  }

  async receiveWebhook(
    channel: string,
    payload: unknown,
    headers: Record<string, string>,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = workspaceId?.trim();
    if (!resolvedWorkspaceId) {
      throw new BadRequestException("Workspace é obrigatório.");
    }

    const provider = this.providers.get(channel);
    if (!provider) {
      throw new BadRequestException("Canal não suportado.");
    }

    const integration = await this.getIntegration(resolvedWorkspaceId, channel);
    const normalizedHeaders = this.normalizeHeaders(headers);
    const isValid = await provider.verifyWebhook(payload, normalizedHeaders, integration);
    if (!isValid) {
      throw new BadRequestException("Webhook inválido.");
    }

    const inboundMessages = await provider.receiveWebhook(payload, normalizedHeaders, integration);
    if (!inboundMessages.length) {
      return { processed: 0, results: [] };
    }

    const results = [];
    for (const inboundMessage of inboundMessages) {
      const contactInfo = provider.mapInboundToContact(inboundMessage);
      const { conversationId, messageId, isDuplicate } = await this.handleInboundMessage(
        resolvedWorkspaceId,
        channel,
        inboundMessage,
        contactInfo
      );
      if (!isDuplicate) {
        results.push({ conversationId, messageId });
      }
    }

    return { processed: results.length, results };
  }

  async sendMessage(channel: string, input: ChannelSendMessageInput, workspaceId?: string) {
    const resolvedWorkspaceId = workspaceId?.trim();
    if (!resolvedWorkspaceId) {
      throw new BadRequestException("Workspace é obrigatório.");
    }

    const provider = this.providers.get(channel);
    if (!provider) {
      throw new BadRequestException("Canal não suportado.");
    }

    const integration = await this.getIntegration(resolvedWorkspaceId, channel);
    return provider.sendMessage(input, integration);
  }

  private async handleInboundMessage(
    workspaceId: string,
    channel: string,
    inboundMessage: ChannelInboundMessage,
    contactInfo: ChannelContact
  ) {
    const contact = await this.upsertContact(workspaceId, contactInfo);

    const result = await this.prisma.$transaction(async (tx) => {
      if (inboundMessage.id) {
        const existingMessage = await tx.message.findUnique({
          where: {
            workspaceId_providerMessageId: {
              workspaceId,
              providerMessageId: inboundMessage.id
            }
          },
          include: {
            conversation: true
          }
        });
        if (existingMessage) {
          return { conversation: existingMessage.conversation, message: existingMessage, isDuplicate: true };
        }
      }

      let conversation = await tx.conversation.findFirst({
        where: {
          workspaceId,
          contactId: contact.id,
          channel,
          status: "OPEN"
        },
        orderBy: { createdAt: "desc" }
      });

      if (!conversation) {
        conversation = await tx.conversation.create({
          data: {
            workspaceId,
            contactId: contact.id,
            channel,
            lastMessageAt: inboundMessage.timestamp
          }
        });
      }

      const message = await tx.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          direction: MessageDirection.IN,
          text: inboundMessage.text,
          providerMessageId: inboundMessage.id,
          sentAt: inboundMessage.timestamp,
          meta: inboundMessage.metadata as Prisma.InputJsonValue | undefined
        }
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: inboundMessage.timestamp }
      });

      return { conversation, message, isDuplicate: false };
    });

    if (!result.isDuplicate) {
      await this.notifyInboundMessage(
        workspaceId,
        result.conversation.id,
        contact.name,
        result.conversation.assignedToUserId
      );

      await this.automationEngineService.dispatch("message.inbound.created", {
        workspaceId,
        conversationId: result.conversation.id,
        messageId: result.message.id,
        contactId: result.conversation.contactId
      });
    }

    return { conversationId: result.conversation.id, messageId: result.message.id, isDuplicate: result.isDuplicate };
  }

  private async notifyInboundMessage(
    workspaceId: string,
    conversationId: string,
    contactName?: string | null,
    assignedToUserId?: string | null
  ) {
    const title = "Nova mensagem inbound";
    const body = contactName ? `Mensagem recebida de ${contactName}.` : "Mensagem recebida.";

    if (assignedToUserId) {
      await this.notificationsService.createNotification({
        workspaceId,
        userId: assignedToUserId,
        conversationId,
        type: NotificationType.INBOUND_MESSAGE,
        title,
        body,
        data: { conversationId }
      });
      return;
    }

    await this.notificationsService.notifyWorkspaceMembers({
      workspaceId,
      conversationId,
      type: NotificationType.INBOUND_MESSAGE,
      title,
      body,
      data: { conversationId }
    });
  }

  private async upsertContact(workspaceId: string, contactInfo: ChannelContact) {
    const phone = contactInfo.phone?.trim() ?? null;
    const email = contactInfo.email?.trim() ?? null;

    if (!phone && !email) {
      throw new BadRequestException("Contato precisa ter telefone ou e-mail.");
    }

    const contact = await this.prisma.contact.findFirst({
      where: {
        workspaceId,
        OR: [
          phone ? { phone } : undefined,
          email ? { email } : undefined
        ].filter(Boolean) as Prisma.ContactWhereInput[]
      }
    });

    if (contact) {
      return contact;
    }

    const name = contactInfo.name?.trim() || phone || email || "Contato";

    return this.prisma.contact.create({
      data: {
        workspaceId,
        name,
        phone: phone ?? undefined,
        email: email ?? undefined
      }
    });
  }

  private normalizeHeaders(headers: Record<string, string | string[] | undefined>) {
    const normalized: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        normalized[key] = value.join(",");
      } else if (value) {
        normalized[key] = value;
      }
    });
    return normalized;
  }

  private async getIntegration(workspaceId: string, channel: string): Promise<ChannelIntegration> {
    const provider = this.resolveProvider(channel);
    const integration = await this.prisma.integrationAccount.findFirst({
      where: { workspaceId, type: provider, status: IntegrationAccountStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      include: { secret: true }
    });

    if (!integration) {
      throw new BadRequestException("Integração do canal não configurada.");
    }

    if (!integration.secret) {
      throw new BadRequestException("Segredos da integração não configurados.");
    }

    const secrets = this.integrationCryptoService.decrypt(integration.secret.encryptedPayload);

    return {
      id: integration.id,
      type: integration.type,
      secrets
    };
  }

  private resolveProvider(channel: string) {
    if (channel === "whatsapp") {
      return IntegrationAccountType.WHATSAPP;
    }
    throw new BadRequestException("Canal não suportado.");
  }
}
