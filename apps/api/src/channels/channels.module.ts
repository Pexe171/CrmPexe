import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ChannelsController } from "./channels.controller";
import { ChannelsService } from "./channels.service";
import { WhatsappProvider } from "./providers/whatsapp.provider";

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, WhatsappProvider],
  exports: [ChannelsService]
})
export class ChannelsModule {}
