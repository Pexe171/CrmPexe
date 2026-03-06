import { Module } from "@nestjs/common";
import { AutomationEngineModule } from "../automation-engine/automation-engine.module";
import { AiModule } from "../ai/ai.module";
import { IntegrationAccountsModule } from "../integration-accounts/integration-accounts.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { QueuesModule } from "../queues/queues.module";
import { ChannelsController } from "./channels.controller";
import { ChannelsService } from "./channels.service";
import { WhatsappProvider } from "./providers/whatsapp.provider";
import { MockOmnichannelProvider } from "./providers/mock-omnichannel.provider";
import { EmailProvider } from "./providers/email.provider";
import { InstagramProvider } from "./providers/instagram.provider";
import { FacebookMessengerProvider } from "./providers/facebook-messenger.provider";

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    IntegrationAccountsModule,
    AutomationEngineModule,
    AiModule,
    QueuesModule
  ],
  controllers: [ChannelsController],
  providers: [
    ChannelsService,
    WhatsappProvider,
    EmailProvider,
    MockOmnichannelProvider,
    InstagramProvider,
    FacebookMessengerProvider
  ],
  exports: [ChannelsService]
})
export class ChannelsModule {}
