import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsModule],
  controllers: [SupportController],
  providers: [SupportService]
})
export class SupportModule {}
