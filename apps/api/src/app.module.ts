import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { AutomationsModule } from "./automations/automations.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { SupportModule } from "./support/support.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CompaniesModule } from "./companies/companies.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { CustomFieldDefinitionsModule } from "./custom-field-definitions/custom-field-definitions.module";
import { ChannelsModule } from "./channels/channels.module";
import { IntegrationAccountsModule } from "./integration-accounts/integration-accounts.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { MessageTemplatesModule } from "./message-templates/message-templates.module";
import { TeamsModule } from "./teams/teams.module";
import { QueuesModule } from "./queues/queues.module";
import { KnowledgeBaseModule } from "./knowledge-base/knowledge-base.module";
import { CannedResponsesModule } from "./canned-responses/canned-responses.module";
import { GlobalSearchModule } from "./global-search/global-search.module";
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
import { SuperAdminModule } from "./super-admin/super-admin.module";
import { LoggingModule } from "./common/logging/logging.module";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

@Module({
  imports: [
    LoggingModule,
    RateLimitModule,
    PrismaModule,
    AuthModule,
    AutomationsModule,
    WorkspacesModule,
    WorkspaceVariablesModule,
    AuditLogsModule,
    SupportModule,
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
    TeamsModule,
    QueuesModule,
    KnowledgeBaseModule,
    CannedResponsesModule,
    GlobalSearchModule,
    WebhooksModule,
    BillingModule,
    AiModule,
    SuperAdminModule
  ],
  controllers: [AppController],
  providers: [AppService, HttpExceptionFilter]
})
export class AppModule {}
