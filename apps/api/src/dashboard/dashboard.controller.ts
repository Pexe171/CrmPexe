import { Controller, Get, Headers, Query, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(AccessTokenGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("sales")
  async getSalesDashboard(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("interval") interval?: string,
    @Query("responsaveisLimit") responsaveisLimit?: string
  ) {
    const parsedLimit = Number(responsaveisLimit);

    return this.dashboardService.getSalesDashboard(user.id, workspaceId, {
      startDate,
      endDate,
      interval,
      responsaveisLimit: Number.isFinite(parsedLimit) ? parsedLimit : undefined
    });
  }

  @Get("automation")
  async getAutomationDashboard(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("interval") interval?: string,
    @Query("templatesLimit") templatesLimit?: string,
    @Query("errosLimit") errosLimit?: string
  ) {
    const parsedTemplatesLimit = Number(templatesLimit);
    const parsedErrosLimit = Number(errosLimit);

    return this.dashboardService.getAutomationDashboard(user.id, workspaceId, {
      startDate,
      endDate,
      interval,
      templatesLimit: Number.isFinite(parsedTemplatesLimit)
        ? parsedTemplatesLimit
        : undefined,
      errosLimit: Number.isFinite(parsedErrosLimit)
        ? parsedErrosLimit
        : undefined
    });
  }
}
