import { BadRequestException, Injectable } from "@nestjs/common";
import { MessageDirection, NotificationType, Prisma } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { IChannelProvider } from "./interfaces/channel-provider.interface";
import { WhatsappProvider } from "./providers/whatsapp.provider";
import { ChannelInboundMessage, ChannelContact } from "./types";

@Injectable()
export class ChannelsService {
  private readonly providers = new Map<string, IChannelProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
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

    const normalizedHeaders = this.normalizeHeaders(headers);
    const isValid = await provider.verifyWebhook(payload, normalizedHeaders);
    if (!isValid) {
      throw new BadRequestException("Webhook inválido.");
    }

    const inboundMessages = await provider.receiveWebhook(payload, normalizedHeaders);
    if (!inboundMessages.length) {
      return { processed: 0, results: [] };
    }

    const results = [];
    for (const inboundMessage of inboundMessages) {
      const contactInfo = provider.mapInboundToContact(inboundMessage);
      const { conversationId, messageId } = await this.handleInboundMessage(
        resolvedWorkspaceId,
        channel,
        inboundMessage,
        contactInfo
      );
      results.push({ conversationId, messageId });
    }

    return { processed: results.length, results };
  }

  private async handleInboundMessage(
    workspaceId: string,
    channel: string,
    inboundMessage: ChannelInboundMessage,
    contactInfo: ChannelContact
  ) {
    const contact = await this.upsertContact(workspaceId, contactInfo);

    const result = await this.prisma.$transaction(async (tx) => {
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

      return { conversation, message };
    });

    await this.notifyInboundMessage(workspaceId, result.conversation.id, contact.name, result.conversation.assignedToUserId);

    return { conversationId: result.conversation.id, messageId: result.message.id };
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
}
