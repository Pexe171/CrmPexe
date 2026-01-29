import { Module } from "@nestjs/common";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { AuthModule } from "../auth/auth.module";
import { SuperAdminController } from "./super-admin.controller";
import { SuperAdminService } from "./super-admin.service";

@Module({
  imports: [AuthModule, AuditLogsModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService]
})
export class SuperAdminModule {}
