import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AutomationEngineService } from "../automation-engine/automation-engine.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealStageDto } from "./dto/update-deal-stage.dto";

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automationEngineService: AutomationEngineService
  ) {}

  async createDeal(
    userId: string,
    payload: CreateDealDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const title = this.normalizeRequiredString(payload.title, "title");
    const stage = this.normalizeOptionalString(payload.stage);
    const contactId = this.normalizeOptionalString(payload.contactId);

    if (contactId) {
      const contactExists = await this.prisma.contact.findFirst({
        where: { id: contactId, workspaceId: resolvedWorkspaceId },
        select: { id: true }
      });

      if (!contactExists) {
        throw new BadRequestException("Contato informado não encontrado.");
      }
    }

    return this.prisma.deal.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        title,
        amount: payload.amount,
        stage: stage ?? undefined,
        contactId: contactId ?? undefined
      }
    });
  }

  async updateDealStage(
    userId: string,
    dealId: string,
    payload: UpdateDealStageDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const stage = this.normalizeRequiredString(payload.stage, "stage");

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId: resolvedWorkspaceId }
    });

    if (!deal) {
      throw new NotFoundException("Negócio não encontrado.");
    }

    if (deal.stage === stage) {
      return deal;
    }

    const updated = await this.prisma.deal.update({
      where: { id: deal.id },
      data: { stage }
    });

    await this.automationEngineService.dispatch("deal.stage.changed", {
      workspaceId: resolvedWorkspaceId,
      dealId: updated.id,
      stage: updated.stage ?? stage,
      previousStage: deal.stage
    });

    return updated;
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }
    const currentWorkspaceId = await this.getCurrentWorkspaceId(userId);
    await this.ensureWorkspaceMembership(userId, currentWorkspaceId);
    return currentWorkspaceId;
  }

  private async getCurrentWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true }
    });

    if (!user?.currentWorkspaceId) {
      throw new BadRequestException("Workspace atual não definido.");
    }

    return user.currentWorkspaceId;
  }

  private async ensureWorkspaceMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    if (!membership) {
      throw new BadRequestException("Workspace inválido.");
    }
  }

  private normalizeRequiredString(
    value: string | undefined | null,
    field: string
  ) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} é obrigatório.`);
    }
    return trimmed;
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
