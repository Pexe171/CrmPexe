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
  MarketplaceService,
  MarketplaceSummary
} from "./marketplace.service";

@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get("summary")
  getSummary(): MarketplaceSummary {
    return this.marketplaceService.getSummary();
  }

  @Get("categories")
  getCategories(): MarketplaceCategory[] {
    return this.marketplaceService.getCategories();
  }

  @Post("categories")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  createCategory(@Body() body: MarketplaceCategoryInput): MarketplaceCategory {
    return this.marketplaceService.createCategory(body);
  }

  @Patch("categories/:id")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  updateCategory(
    @Param("id") id: string,
    @Body() body: Partial<MarketplaceCategoryInput>
  ): MarketplaceCategory | null {
    return this.marketplaceService.updateCategory(id, body);
  }

  @Delete("categories/:id")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  removeCategory(@Param("id") id: string): { removed: boolean } {
    return { removed: this.marketplaceService.removeCategory(id) };
  }

  @Get("agents")
  getAgents(
    @Query("category") category?: string,
    @Query("search") search?: string
  ): MarketplaceAgent[] {
    return this.marketplaceService.getAgents({ category, search });
  }

  @Post("agents")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  createAgent(@Body() body: MarketplaceAgentInput): MarketplaceAgent {
    return this.marketplaceService.createAgent(body);
  }

  @Patch("agents/:id")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  updateAgent(
    @Param("id") id: string,
    @Body() body: Partial<MarketplaceAgentInput>
  ): MarketplaceAgent | null {
    return this.marketplaceService.updateAgent(id, body);
  }

  @Delete("agents/:id")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  removeAgent(@Param("id") id: string): { removed: boolean } {
    return { removed: this.marketplaceService.removeAgent(id) };
  }

  @Post("agents/:id/install")
  @UseGuards(AccessTokenGuard, SuperAdminGuard)
  installAgent(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.marketplaceService.installAgent(user.id, id, workspaceId);
  }
}
