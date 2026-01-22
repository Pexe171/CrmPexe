import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTags(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    return this.prisma.tag.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      orderBy: { name: "asc" }
    });
  }

  async createTag(userId: string, payload: CreateTagDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const name = this.normalizeRequiredString(payload.name, "name");
    const color = this.normalizeOptionalString(payload.color);

    return this.prisma.tag.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        name,
        color
      }
    });
  }

  async updateTag(userId: string, tagId: string, payload: UpdateTagDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, workspaceId: resolvedWorkspaceId }
    });

    if (!tag) {
      throw new NotFoundException("Tag não encontrada.");
    }

    const name = payload.name !== undefined ? this.normalizeRequiredString(payload.name, "name") : undefined;
    const color = payload.color !== undefined ? this.normalizeOptionalString(payload.color) : undefined;

    return this.prisma.tag.update({
      where: { id: tag.id },
      data: {
        name,
        color
      }
    });
  }

  async deleteTag(userId: string, tagId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, workspaceId: resolvedWorkspaceId }
    });

    if (!tag) {
      throw new NotFoundException("Tag não encontrada.");
    }

    await this.prisma.tag.delete({
      where: { id: tag.id }
    });

    return { success: true };
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }
    return this.getCurrentWorkspaceId(userId);
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
