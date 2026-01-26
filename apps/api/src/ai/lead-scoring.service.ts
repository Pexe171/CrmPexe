import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "./ai.service";

type LeadScorePayload = {
  workspaceId: string;
  contactId: string;
  leadName?: string | null;
  lastMessage: string;
  source?: string | null;
};

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService
  ) {}

  async classifyInboundLead(payload: LeadScorePayload) {
    try {
      const result = await this.aiService.classifyLead(payload.workspaceId, {
        leadName: payload.leadName ?? undefined,
        lastMessage: payload.lastMessage,
        source: payload.source ?? undefined
      });

      await this.prisma.contact.update({
        where: { id: payload.contactId },
        data: {
          leadScore: result.score,
          leadScoreLabel: result.label
        }
      });

      await this.prisma.deal.updateMany({
        where: {
          workspaceId: payload.workspaceId,
          contactId: payload.contactId
        },
        data: {
          leadScore: result.score,
          leadScoreLabel: result.label
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      this.logger.warn(
        `Falha ao classificar lead inbound (contactId=${payload.contactId}). ${message}`
      );
    }
  }
}
