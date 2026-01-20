import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CompaniesModule } from "./companies/companies.module";
import { PrismaModule } from "./prisma/prisma.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";

@Module({
  imports: [PrismaModule, AuthModule, WorkspacesModule, AuditLogsModule, CompaniesModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
