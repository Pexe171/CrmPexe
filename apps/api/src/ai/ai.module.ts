import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { MockAiProvider } from "./providers/mock-ai.provider";

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiService, MockAiProvider],
  exports: [AiService]
})
export class AiModule {}
