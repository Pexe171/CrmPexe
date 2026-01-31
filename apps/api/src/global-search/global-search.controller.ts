import { Controller, Get, Headers, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { GlobalSearchService } from "./global-search.service";

@Controller("global-search")
@UseGuards(AccessTokenGuard)
export class GlobalSearchController {
  constructor(private readonly globalSearchService: GlobalSearchService) {}

  @Get()
  async search(
    @CurrentUser() user: AuthUser,
    @Query("query") query?: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.globalSearchService.search(user.id, query, workspaceId);
  }
}
