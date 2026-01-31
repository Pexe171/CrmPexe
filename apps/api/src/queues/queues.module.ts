import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { QueuesController } from "./queues.controller";
import { QueuesService } from "./queues.service";

@Module({
  imports: [PrismaModule],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService]
})
export class QueuesModule {}
