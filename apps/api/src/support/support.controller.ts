import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { SuperAdminGuard } from "../auth/super-admin.guard";
import { CreateImpersonationDto } from "./dto/create-impersonation.dto";
import { SupportService } from "./support.service";

@Controller("support")
@UseGuards(AccessTokenGuard, SuperAdminGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post("impersonations")
  async createImpersonation(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateImpersonationDto
  ) {
    return this.supportService.createImpersonationToken({
      superAdminId: user.id,
      userId: body.userId,
      workspaceId: body.workspaceId,
      reason: body.reason
    });
  }
}
