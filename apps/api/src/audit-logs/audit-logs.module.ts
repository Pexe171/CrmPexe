import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuditLogInterceptor } from "./audit-log.interceptor";
import { AuditLogsController } from "./audit-logs.controller";
import { AuditLogsService } from "./audit-logs.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    AuditLogInterceptor,
    AccessTokenGuard,
    {
      provide: APP_INTERCEPTOR,
      useExisting: AuditLogInterceptor
    }
  ],
  exports: [AuditLogsService]
})
export class AuditLogsModule {}
