import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { KnowledgeBaseController } from "./knowledge-base.controller";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService]
})
export class KnowledgeBaseModule {}
