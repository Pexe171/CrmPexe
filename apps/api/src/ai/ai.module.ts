import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkspaceVariablesModule } from "../workspace-variables/workspace-variables.module";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { AiProcessingQueueService } from "./ai-processing.queue";
import { LeadScoringService } from "./lead-scoring.service";
import { OpenAiProvider } from "./providers/openai.provider";

@Module({
  imports: [AuthModule, WorkspaceVariablesModule],
  controllers: [AiController],
  providers: [AiService, LeadScoringService, AiProcessingQueueService, OpenAiProvider],
  exports: [AiService, LeadScoringService, AiProcessingQueueService]
})
export class AiModule {}
