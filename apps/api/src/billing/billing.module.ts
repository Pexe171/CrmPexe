import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { MercadoPagoBillingProvider } from "./providers/mercado-pago-billing.provider";

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, MercadoPagoBillingProvider]
})
export class BillingModule {}
