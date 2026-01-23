import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CompaniesModule } from "./companies/companies.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { CustomFieldDefinitionsModule } from "./custom-field-definitions/custom-field-definitions.module";
import { ChannelsModule } from "./channels/channels.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TagsModule } from "./tags/tags.module";
import { TasksModule } from "./tasks/tasks.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    AuditLogsModule,
    CompaniesModule,
    ConversationsModule,
    ChannelsModule,
    NotificationsModule,
    TasksModule,
    TagsModule,
    CustomFieldDefinitionsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
