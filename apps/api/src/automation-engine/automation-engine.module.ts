import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AutomationEngineService } from "./automation-engine.service";

@Module({
  imports: [PrismaModule],
  providers: [AutomationEngineService],
  exports: [AutomationEngineService]
})
export class AutomationEngineModule {}
