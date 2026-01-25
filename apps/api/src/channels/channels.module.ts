import { Module } from "@nestjs/common";
import { AutomationEngineModule } from "../automation-engine/automation-engine.module";
import { IntegrationAccountsModule } from "../integration-accounts/integration-accounts.module";
import { MetricsModule } from "../metrics/metrics.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ChannelsController } from "./channels.controller";
import { ChannelsService } from "./channels.service";
import { WhatsappProvider } from "./providers/whatsapp.provider";

@Module({
  imports: [PrismaModule, NotificationsModule, IntegrationAccountsModule, AutomationEngineModule, MetricsModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, WhatsappProvider],
  exports: [ChannelsService]
})
export class ChannelsModule {}
