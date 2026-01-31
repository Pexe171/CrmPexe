import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCannedResponseDto } from "./dto/create-canned-response.dto";
import { UpdateCannedResponseDto } from "./dto/update-canned-response.dto";

@Injectable()
export class CannedResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  async listResponses(
    userId: string,
    params: { search?: string; isActive?: string },
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const search = params.search?.trim();
    const where: Prisma.CannedResponseWhereInput = {
      workspaceId: resolvedWorkspaceId
    };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive === "true";
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { shortcut: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } }
      ];
    }

    return this.prisma.cannedResponse.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
  }

  async createResponse(userId: string, payload: CreateCannedResponseDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const title = this.normalizeRequiredString(payload.title, "title");
    const content = this.normalizeRequiredString(payload.content, "content");
    const tags = payload.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];
    const shortcut = this.normalizeOptionalString(payload.shortcut);

    return this.prisma.cannedResponse.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        title,
        content,
        tags,
        shortcut: shortcut ?? undefined,
        isActive: payload.isActive ?? true
      }
    });
  }

  async updateResponse(
    userId: string,
    responseId: string,
    payload: UpdateCannedResponseDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const response = await this.prisma.cannedResponse.findFirst({
      where: { id: responseId, workspaceId: resolvedWorkspaceId }
    });

    if (!response) {
      throw new NotFoundException("Resposta rápida não encontrada.");
    }

    const data: Prisma.CannedResponseUpdateInput = {
      title: payload.title ? this.normalizeRequiredString(payload.title, "title") : undefined,
      content: payload.content ? this.normalizeRequiredString(payload.content, "content") : undefined,
      tags: payload.tags ? payload.tags.map((tag) => tag.trim()).filter(Boolean) : undefined,
      shortcut: payload.shortcut !== undefined ? this.normalizeOptionalString(payload.shortcut) : undefined,
      isActive: payload.isActive
    };

    return this.prisma.cannedResponse.update({
      where: { id: response.id },
      data
    });
  }

  async deleteResponse(userId: string, responseId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const response = await this.prisma.cannedResponse.findFirst({
      where: { id: responseId, workspaceId: resolvedWorkspaceId }
    });

    if (!response) {
      throw new NotFoundException("Resposta rápida não encontrada.");
    }

    await this.prisma.cannedResponse.delete({
      where: { id: response.id }
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
