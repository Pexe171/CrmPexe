import { Module } from "@nestjs/common";
import { MetricsModule } from "../metrics/metrics.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AutomationEngineService } from "./automation-engine.service";

@Module({
  imports: [PrismaModule, MetricsModule],
  providers: [AutomationEngineService],
  exports: [AutomationEngineService]
})
export class AutomationEngineModule {}
