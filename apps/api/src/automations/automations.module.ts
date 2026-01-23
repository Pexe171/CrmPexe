import { Module } from "@nestjs/common";
import { AutomationsController } from "./automations.controller";
import { AutomationsService } from "./automations.service";
import { AutomationConnectorsService } from "./connectors/automation-connectors.service";
import { MockAutomationConnector } from "./connectors/mock-automation-connector.service";

@Module({
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationConnectorsService, MockAutomationConnector]
})
export class AutomationsModule {}
