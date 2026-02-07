import {
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
  UseGuards
} from "@nestjs/common";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AccessTokenGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(
    @CurrentUser() user: AuthUser,
    @Headers("x-workspace-id") workspaceId?: string,
    @Query("unreadOnly") unreadOnly?: string
  ) {
    const resolvedUnreadOnly = unreadOnly === "true";
    return this.notificationsService.listNotifications(
      user.id,
      workspaceId,
      resolvedUnreadOnly
    );
  }

  @Patch(":id/read")
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param("id") notificationId: string,
    @Headers("x-workspace-id") workspaceId?: string
  ) {
    return this.notificationsService.markAsRead(
      user.id,
      notificationId,
      workspaceId
    );
  }
}
