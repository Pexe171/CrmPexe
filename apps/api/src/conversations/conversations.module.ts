import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChannelsModule } from "../channels/channels.module";
import { MetricsModule } from "../metrics/metrics.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule, ChannelsModule, MetricsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService]
})
export class ConversationsModule {}
