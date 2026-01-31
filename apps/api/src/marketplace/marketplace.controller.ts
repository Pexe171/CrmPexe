import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
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
  createCategory(@Body() body: MarketplaceCategoryInput): MarketplaceCategory {
    return this.marketplaceService.createCategory(body);
  }

  @Patch("categories/:id")
  updateCategory(
    @Param("id") id: string,
    @Body() body: Partial<MarketplaceCategoryInput>
  ): MarketplaceCategory | null {
    return this.marketplaceService.updateCategory(id, body);
  }

  @Delete("categories/:id")
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
  createAgent(@Body() body: MarketplaceAgentInput): MarketplaceAgent {
    return this.marketplaceService.createAgent(body);
  }

  @Patch("agents/:id")
  updateAgent(
    @Param("id") id: string,
    @Body() body: Partial<MarketplaceAgentInput>
  ): MarketplaceAgent | null {
    return this.marketplaceService.updateAgent(id, body);
  }

  @Delete("agents/:id")
  removeAgent(@Param("id") id: string): { removed: boolean } {
    return { removed: this.marketplaceService.removeAgent(id) };
  }
}
