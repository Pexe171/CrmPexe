import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { QueuesController } from "./queues.controller";
import { QueuesService } from "./queues.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService]
})
export class QueuesModule {}
