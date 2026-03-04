import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { IntegrationAccountsController } from "./integration-accounts.controller";
import { IntegrationAccountsService } from "./integration-accounts.service";
import { IntegrationCryptoService } from "./integration-crypto.service";
import { WhatsappNativeService } from "./whatsapp-native.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [IntegrationAccountsController],
  providers: [IntegrationAccountsService, IntegrationCryptoService, WhatsappNativeService],
  exports: [IntegrationCryptoService]
})
export class IntegrationAccountsModule {}
