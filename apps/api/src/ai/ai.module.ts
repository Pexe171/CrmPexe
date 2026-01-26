import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { LeadScoringService } from "./lead-scoring.service";
import { MockAiProvider } from "./providers/mock-ai.provider";

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiService, LeadScoringService, MockAiProvider],
  exports: [AiService, LeadScoringService]
})
export class AiModule {}
