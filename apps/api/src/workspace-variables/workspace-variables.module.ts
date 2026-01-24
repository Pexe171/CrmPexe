import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IntegrationAccountsModule } from "../integration-accounts/integration-accounts.module";
import { WorkspaceVariablesController } from "./workspace-variables.controller";
import { WorkspaceVariablesService } from "./workspace-variables.service";

@Module({
  imports: [AuthModule, IntegrationAccountsModule],
  controllers: [WorkspaceVariablesController],
  providers: [WorkspaceVariablesService],
  exports: [WorkspaceVariablesService]
})
export class WorkspaceVariablesModule {}
