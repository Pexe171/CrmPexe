import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CannedResponsesController } from "./canned-responses.controller";
import { CannedResponsesService } from "./canned-responses.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CannedResponsesController],
  providers: [CannedResponsesService]
})
export class CannedResponsesModule {}
