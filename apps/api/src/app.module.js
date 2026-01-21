// apps/api/src/app.module.ts
import { Module } from "@nestjs/common";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { AuthModule } from "./auth/auth.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CompaniesModule } from "./companies/companies.module";
import { CustomFieldDefinitionsModule } from "./custom-field-definitions/custom-field-definitions.module";
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
    TasksModule,
    TagsModule,
    CustomFieldDefinitionsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
