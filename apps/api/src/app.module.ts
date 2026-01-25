import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { AutomationsModule } from "./automations/automations.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CompaniesModule } from "./companies/companies.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { CustomFieldDefinitionsModule } from "./custom-field-definitions/custom-field-definitions.module";
import { ChannelsModule } from "./channels/channels.module";
import { IntegrationAccountsModule } from "./integration-accounts/integration-accounts.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { MessageTemplatesModule } from "./message-templates/message-templates.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { N8nModule } from "./n8n/n8n.module";
import { PrismaModule } from "./prisma/prisma.module";
import { DealsModule } from "./deals/deals.module";
import { TagsModule } from "./tags/tags.module";
import { TasksModule } from "./tasks/tasks.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { WorkspaceVariablesModule } from "./workspace-variables/workspace-variables.module";
import { BillingModule } from "./billing/billing.module";
import { AiModule } from "./ai/ai.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AutomationsModule,
    WorkspacesModule,
    WorkspaceVariablesModule,
    AuditLogsModule,
    CompaniesModule,
    ConversationsModule,
    ChannelsModule,
    IntegrationAccountsModule,
    DashboardModule,
    N8nModule,
    NotificationsModule,
    TasksModule,
    TagsModule,
    DealsModule,
    CustomFieldDefinitionsModule,
    MessageTemplatesModule,
    WebhooksModule,
    BillingModule,
    AiModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
