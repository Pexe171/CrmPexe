import { Module } from "@nestjs/common";
import { IntegrationAccountsModule } from "../integration-accounts/integration-accounts.module";
import { PrismaModule } from "../prisma/prisma.module";
import { N8nClient } from "./n8n.client";

@Module({
  imports: [PrismaModule, IntegrationAccountsModule],
  providers: [N8nClient],
  exports: [N8nClient]
})
export class N8nModule {}
