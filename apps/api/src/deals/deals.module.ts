import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AutomationEngineModule } from "../automation-engine/automation-engine.module";
import { MetricsModule } from "../metrics/metrics.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DealsController } from "./deals.controller";
import { DealsService } from "./deals.service";

@Module({
  imports: [PrismaModule, AutomationEngineModule, AuthModule, MetricsModule],
  controllers: [DealsController],
  providers: [DealsService]
})
export class DealsModule {}
