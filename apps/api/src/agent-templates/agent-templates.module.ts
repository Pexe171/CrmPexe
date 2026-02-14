import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AgentTemplatesController } from "./agent-templates.controller";
import { AgentTemplatesService } from "./agent-templates.service";
import { N8nAgentPublisherService } from "./n8n-agent-publisher.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AgentTemplatesController],
  providers: [AgentTemplatesService, N8nAgentPublisherService],
  exports: [AgentTemplatesService, N8nAgentPublisherService]
})
export class AgentTemplatesModule {}
