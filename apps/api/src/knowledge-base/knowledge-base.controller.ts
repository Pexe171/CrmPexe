import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateKnowledgeBaseArticleDto } from "./dto/create-knowledge-base-article.dto";
import { UpdateKnowledgeBaseArticleDto } from "./dto/update-knowledge-base-article.dto";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Controller("knowledge-base-articles")
@UseGuards(AccessTokenGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  async listArticles(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("isActive") isActive?: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.knowledgeBaseService.listArticles(user.id, { search, isActive }, workspaceId);
  }

  @Post()
  async createArticle(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateKnowledgeBaseArticleDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.knowledgeBaseService.createArticle(user.id, body, workspaceId);
  }

  @Patch(":id")
  async updateArticle(
    @CurrentUser() user: AuthUser,
    @Param("id") articleId: string,
    @Body() body: UpdateKnowledgeBaseArticleDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.knowledgeBaseService.updateArticle(user.id, articleId, body, workspaceId);
  }

  @Delete(":id")
  async deleteArticle(
    @CurrentUser() user: AuthUser,
    @Param("id") articleId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.knowledgeBaseService.deleteArticle(user.id, articleId, workspaceId);
  }
}
