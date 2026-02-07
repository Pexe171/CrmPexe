import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateKnowledgeBaseArticleDto } from "./dto/create-knowledge-base-article.dto";
import { UpdateKnowledgeBaseArticleDto } from "./dto/update-knowledge-base-article.dto";

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  async listArticles(
    userId: string,
    params: { search?: string; isActive?: string },
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const search = params.search?.trim();
    const where: Prisma.KnowledgeBaseArticleWhereInput = {
      workspaceId: resolvedWorkspaceId
    };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive === "true";
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } }
      ];
    }

    return this.prisma.knowledgeBaseArticle.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
  }

  async createArticle(
    userId: string,
    payload: CreateKnowledgeBaseArticleDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const title = this.normalizeRequiredString(payload.title, "title");
    const content = this.normalizeRequiredString(payload.content, "content");
    const tags = payload.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];

    return this.prisma.knowledgeBaseArticle.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        title,
        content,
        tags,
        isActive: payload.isActive ?? true
      }
    });
  }

  async updateArticle(
    userId: string,
    articleId: string,
    payload: UpdateKnowledgeBaseArticleDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const article = await this.prisma.knowledgeBaseArticle.findFirst({
      where: { id: articleId, workspaceId: resolvedWorkspaceId }
    });

    if (!article) {
      throw new NotFoundException("Artigo não encontrado.");
    }

    const data: Prisma.KnowledgeBaseArticleUpdateInput = {
      title: payload.title
        ? this.normalizeRequiredString(payload.title, "title")
        : undefined,
      content: payload.content
        ? this.normalizeRequiredString(payload.content, "content")
        : undefined,
      tags: payload.tags
        ? payload.tags.map((tag) => tag.trim()).filter(Boolean)
        : undefined,
      isActive: payload.isActive
    };

    return this.prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data
    });
  }

  async deleteArticle(userId: string, articleId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const article = await this.prisma.knowledgeBaseArticle.findFirst({
      where: { id: articleId, workspaceId: resolvedWorkspaceId }
    });

    if (!article) {
      throw new NotFoundException("Artigo não encontrado.");
    }

    await this.prisma.knowledgeBaseArticle.delete({
      where: { id: article.id }
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
}
