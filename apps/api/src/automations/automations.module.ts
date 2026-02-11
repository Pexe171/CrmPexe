import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { N8nModule } from "../n8n/n8n.module";
import { WorkspaceVariablesModule } from "../workspace-variables/workspace-variables.module";
import { IntegrationAccountsModule } from "../integration-accounts/integration-accounts.module";
import { AutomationsController } from "./automations.controller";
import { AutomationsService } from "./automations.service";
import { AutomationConnectorsService } from "./connectors/automation-connectors.service";
import { MockAutomationConnector } from "./connectors/mock-automation-connector.service";

@Module({
  imports: [
    AuthModule,
    N8nModule,
    WorkspaceVariablesModule,
    IntegrationAccountsModule
  ],
  controllers: [AutomationsController],
  providers: [
    AutomationsService,
    AutomationConnectorsService,
    MockAutomationConnector
  ]
})
export class AutomationsModule {}
