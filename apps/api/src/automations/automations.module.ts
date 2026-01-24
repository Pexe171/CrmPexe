import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AutomationsController } from "./automations.controller";
import { AutomationsService } from "./automations.service";
import { AutomationConnectorsService } from "./connectors/automation-connectors.service";
import { MockAutomationConnector } from "./connectors/mock-automation-connector.service";

@Module({
  imports: [AuthModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationConnectorsService, MockAutomationConnector]
})
export class AutomationsModule {}
