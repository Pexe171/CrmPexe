import { Body, Controller, Headers, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuditEntity } from "../audit-logs/audit-log.decorator";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealStageDto } from "./dto/update-deal-stage.dto";
import { DealsService } from "./deals.service";

@Controller("deals")
@UseGuards(AccessTokenGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @AuditEntity({
    entity: "Deal",
    entityId: { source: "response", key: "id" },
    workspaceId: { source: "user" },
    metadata: (request) => ({
      title: request.body?.title,
      stage: request.body?.stage
    })
  })
  async createDeal(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateDealDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.dealsService.createDeal(user.id, body, workspaceId);
  }

  @Patch(":id/stage")
  @AuditEntity({
    entity: "Deal",
    entityId: { source: "param", key: "id" },
    workspaceId: { source: "user" },
    metadata: (request) => ({
      stage: request.body?.stage
    })
  })
  async updateDealStage(
    @CurrentUser() user: AuthUser,
    @Param("id") dealId: string,
    @Body() body: UpdateDealStageDto,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.dealsService.updateDealStage(user.id, dealId, body, workspaceId);
  }
}
