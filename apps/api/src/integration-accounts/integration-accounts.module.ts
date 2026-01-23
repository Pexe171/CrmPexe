import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { IntegrationAccountsController } from "./integration-accounts.controller";
import { IntegrationAccountsService } from "./integration-accounts.service";
import { IntegrationCryptoService } from "./integration-crypto.service";

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationAccountsController],
  providers: [IntegrationAccountsService, IntegrationCryptoService],
  exports: [IntegrationCryptoService]
})
export class IntegrationAccountsModule {}
