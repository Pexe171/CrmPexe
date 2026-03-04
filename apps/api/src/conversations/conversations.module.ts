import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AuthModule } from "../auth/auth.module";
import { ChannelsModule } from "../channels/channels.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsGateway } from "./conversations.gateway";
import { ConversationsService } from "./conversations.service";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    NotificationsModule,
    ChannelsModule
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsGateway]
})
export class ConversationsModule {}
