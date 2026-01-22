import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "../auth/auth.module";
import { AuditLogInterceptor } from "./audit-log.interceptor";
import { AuditLogsController } from "./audit-logs.controller";
import { AuditLogsService } from "./audit-logs.service";

@Module({
  imports: [AuthModule],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    AuditLogInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: AuditLogInterceptor
    }
  ],
  exports: [AuditLogsService]
})
export class AuditLogsModule {}
