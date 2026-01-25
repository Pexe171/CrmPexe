import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MetricsService } from "../metrics/metrics.service";
import { MetricEventType } from "../metrics/metric-event.types";
import {
  AutomationPayloadMap,
  AutomationTrigger,
  DealStageChangedPayload,
  MessageInboundCreatedPayload
} from "./automation-engine.types";

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService
  ) {}

  async dispatch<TTrigger extends AutomationTrigger>(trigger: TTrigger, payload: AutomationPayloadMap[TTrigger]) {
    const workspaceId = (payload as { workspaceId?: string }).workspaceId;
    let handled = false;

    try {
      switch (trigger) {
        case "message.inbound.created":
          await this.handleMessageInbound(payload as MessageInboundCreatedPayload);
          handled = true;
          break;
        case "deal.stage.changed":
          await this.handleDealStageChanged(payload as DealStageChangedPayload);
          handled = true;
          break;
        default:
          this.logger.warn(`Trigger não suportado: ${trigger}`);
      }

      if (handled && workspaceId) {
        await this.metricsService.recordEvent({
          workspaceId,
          type: MetricEventType.AutomationSuccess,
          payload: {
            trigger
          }
        });
      }
    } catch (error) {
      if (workspaceId) {
        await this.metricsService.recordEvent({
          workspaceId,
          type: MetricEventType.AutomationFailure,
          payload: {
            trigger,
            error: error instanceof Error ? error.message : "Erro desconhecido"
          }
        });
      }

      throw error;
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
