import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AutomationPayloadMap,
  AutomationTrigger,
  DealStageChangedPayload,
  MessageInboundCreatedPayload
} from "./automation-engine.types";

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async dispatch<TTrigger extends AutomationTrigger>(trigger: TTrigger, payload: AutomationPayloadMap[TTrigger]) {
    switch (trigger) {
      case "message.inbound.created":
        await this.handleMessageInbound(payload as MessageInboundCreatedPayload);
        break;
      case "deal.stage.changed":
        await this.handleDealStageChanged(payload as DealStageChangedPayload);
        break;
      default:
        this.logger.warn(`Trigger não suportado: ${trigger}`);
    }
  }

  private async handleMessageInbound(payload: MessageInboundCreatedPayload) {
    const tag = await this.ensureTag(payload.workspaceId, "Inbound");
    await this.ensureTagOnContact(payload.workspaceId, tag.id, payload.contactId);

    await this.prisma.task.create({
      data: {
        workspaceId: payload.workspaceId,
        title: "Responder mensagem inbound",
        relatedType: "CONVERSATION",
        relatedId: payload.conversationId
      }
    });

    this.logger.log(
      `Ações executadas para message.inbound.created (messageId=${payload.messageId}, conversationId=${payload.conversationId}).`
    );
  }

  private async handleDealStageChanged(payload: DealStageChangedPayload) {
    const tag = await this.ensureTag(payload.workspaceId, `Etapa: ${payload.stage}`);
    await this.ensureTagOnDeal(payload.workspaceId, tag.id, payload.dealId);

    await this.prisma.task.create({
      data: {
        workspaceId: payload.workspaceId,
        title: `Revisar negócio na etapa ${payload.stage}`,
        relatedType: "DEAL",
        relatedId: payload.dealId
      }
    });

    this.logger.log(
      `Ações executadas para deal.stage.changed (dealId=${payload.dealId}, stage=${payload.stage}).`
    );
  }

  private async ensureTag(workspaceId: string, name: string) {
    const existing = await this.prisma.tag.findFirst({
      where: { workspaceId, name }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.tag.create({
      data: {
        workspaceId,
        name
      }
    });
  }

  private async ensureTagOnContact(workspaceId: string, tagId: string, contactId: string) {
    const existing = await this.prisma.tagOnContact.findFirst({
      where: { workspaceId, tagId, contactId }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.tagOnContact.create({
      data: {
        workspaceId,
        tagId,
        contactId
      }
    });
  }

  private async ensureTagOnDeal(workspaceId: string, tagId: string, dealId: string) {
    const existing = await this.prisma.tagOnDeal.findFirst({
      where: { workspaceId, tagId, dealId }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.tagOnDeal.create({
      data: {
        workspaceId,
        tagId,
        dealId
      }
    });
  }
}
