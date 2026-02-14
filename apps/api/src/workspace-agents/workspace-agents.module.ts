import { Module } from "@nestjs/common";
import { AgentTemplatesModule } from "../agent-templates/agent-templates.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkspaceAgentsController } from "./workspace-agents.controller";
import { WorkspaceAgentsService } from "./workspace-agents.service";

@Module({
  imports: [PrismaModule, AgentTemplatesModule],
  controllers: [WorkspaceAgentsController],
  providers: [WorkspaceAgentsService]
})
export class WorkspaceAgentsModule {}
