import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AutomationEngineService } from "../automation-engine/automation-engine.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { UpdateDealStageDto } from "./dto/update-deal-stage.dto";

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automationEngineService: AutomationEngineService
  ) {}

  async listDeals(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    return this.prisma.deal.findMany({
      where: { workspaceId: resolvedWorkspaceId, deletedAt: null },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        contact: {
          select: { id: true, name: true, email: true, phone: true }
        }
      }
    });
  }

  async createDeal(userId: string, payload: CreateDealDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
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

  async updateDealStage(userId: string, dealId: string, payload: UpdateDealStageDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
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

  async updateDeal(userId: string, dealId: string, payload: UpdateDealDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId: resolvedWorkspaceId, deletedAt: null }
    });

    if (!deal) {
      throw new NotFoundException("Negócio não encontrado.");
    }

    const data: { title?: string; amount?: number | null; stage?: string | null; contactId?: string | null } = {};
    if (payload.title !== undefined) {
      const t = payload.title?.trim();
      if (!t) throw new BadRequestException("title não pode ser vazio.");
      data.title = t;
    }
    if (payload.amount !== undefined) data.amount = payload.amount;
    if (payload.stage !== undefined) data.stage = this.normalizeOptionalString(payload.stage);
    if (payload.contactId !== undefined) data.contactId = this.normalizeOptionalString(payload.contactId);

    if (Object.keys(data).length === 0) {
      return deal;
    }

    return this.prisma.deal.update({
      where: { id: deal.id },
      data
    });
  }

  async deleteDeal(userId: string, dealId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId: resolvedWorkspaceId, deletedAt: null }
    });

    if (!deal) {
      throw new NotFoundException("Negócio não encontrado.");
    }

    await this.prisma.deal.update({
      where: { id: deal.id },
      data: { deletedAt: new Date() }
    });

    return { id: deal.id, deletedAt: new Date() };
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

  private normalizeRequiredString(value: string | undefined | null, field: string) {
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
