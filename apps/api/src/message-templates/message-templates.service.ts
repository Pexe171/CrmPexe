import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMessageTemplateDto } from "./dto/create-message-template.dto";

@Injectable()
export class MessageTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    return this.prisma.messageTemplate.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createTemplate(userId: string, payload: CreateMessageTemplateDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const name = this.normalizeRequiredString(payload.name, "name");
    const language = this.normalizeRequiredString(payload.language, "language");
    const content = this.normalizeRequiredString(payload.content, "content");
    const channel = payload.channel?.trim() || "whatsapp";
    const externalId = this.normalizeOptionalString(payload.externalId);

    return this.prisma.messageTemplate.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        name,
        language,
        content,
        channel,
        externalId: externalId ?? undefined
      }
    });
  }

  async deleteTemplate(userId: string, templateId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const template = await this.prisma.messageTemplate.findFirst({
      where: { id: templateId, workspaceId: resolvedWorkspaceId }
    });

    if (!template) {
      throw new NotFoundException("Template não encontrado.");
    }

    await this.prisma.messageTemplate.delete({
      where: { id: template.id }
    });

    return { success: true };
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
