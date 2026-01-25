import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { MockAiProvider } from "./providers/mock-ai.provider";

@Module({
  providers: [AiService, MockAiProvider],
  exports: [AiService]
})
export class AiModule {}
