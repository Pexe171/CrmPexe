import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { SuperAdminGuard } from "../auth/super-admin.guard";
import {
  MarketplaceAgent,
  MarketplaceAgentInput,
  MarketplaceCategory,
  MarketplaceCategoryInput,
  MarketplaceInterest,
  MarketplaceService,
  MarketplaceSummary
} from "./marketplace.service";

@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get("summary")
  async getSummary(): Promise<MarketplaceSummary> {
    return this.marketplaceService.getSummary();
  }

  @Get("categories")
  async getCategories(): Promise<MarketplaceCategory[]> {
    return this.marketplaceService.getCategories();
  }

  @Post("categories")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  async createCategory(
    @Body() body: MarketplaceCategoryInput
  ): Promise<MarketplaceCategory> {
    return this.marketplaceService.createCategory(body);
  }

  @Patch("categories/:id")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  async updateCategory(
    @Param("id") id: string,
    @Body() body: Partial<MarketplaceCategoryInput>
  ): Promise<MarketplaceCategory | null> {
    return this.marketplaceService.updateCategory(id, body);
  }

  @Delete("categories/:id")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  async removeCategory(@Param("id") id: string): Promise<{ removed: boolean }> {
    return { removed: await this.marketplaceService.removeCategory(id) };
  }

  @Get("agents")
  async getAgents(
    @Query("category") category?: string,
    @Query("search") search?: string
  ): Promise<MarketplaceAgent[]> {
    return this.marketplaceService.getAgents({ category, search });
  }

  @Post("agents")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  async createAgent(
    @CurrentUser() user: AuthUser,
    @Body() body: MarketplaceAgentInput
  ): Promise<MarketplaceAgent> {
    return this.marketplaceService.createAgent(user.id, body);
  }

  @Patch("agents/:id")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  async updateAgent(
    @Param("id") id: string,
    @Body() body: Partial<MarketplaceAgentInput>
  ): Promise<MarketplaceAgent | null> {
    return this.marketplaceService.updateAgent(id, body);
  }

  @Delete("agents/:id")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  async removeAgent(@Param("id") id: string): Promise<{ removed: boolean }> {
    return { removed: await this.marketplaceService.removeAgent(id) };
  }

  @Post("agents/:id/install")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  async installAgent(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.marketplaceService.installAgent(user.id, id, workspaceId);
  }

  @Post("agents/:id/interest")
  @UseGuards(AccessTokenGuard)
  async requestInterest(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.marketplaceService.requestInterest(user.id, id, workspaceId);
  }

  @Get("interests")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  async listInterests(): Promise<MarketplaceInterest[]> {
    return this.marketplaceService.listInterests();
  }
}
