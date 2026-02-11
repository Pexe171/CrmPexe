import { Injectable } from "@nestjs/common";
import { AiUsageAction, AiUsageStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceVariablesService } from "../workspace-variables/workspace-variables.service";
import { OpenAiProvider } from "./providers/openai.provider";
import {
  ExtractFieldsInput,
  ExtractFieldsResult,
  LeadClassificationInput,
  LeadClassificationResult,
  SummarizeConversationInput,
  SummarizeConversationResult,
  SuggestReplyInput,
  SuggestReplyResult
} from "./ai.types";

type AiAction = AiUsageAction;

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: OpenAiProvider,
    private readonly workspaceVariablesService: WorkspaceVariablesService
  ) {}

  async summarizeConversation(
    workspaceId: string,
    input: SummarizeConversationInput
  ): Promise<SummarizeConversationResult> {
    return this.execute(AiUsageAction.SUMMARIZE_CONVERSATION, workspaceId, input, async () => {
      const config = await this.resolveProviderConfig(workspaceId);
      return this.provider.summarizeConversation(input, config);
    });
  }

  async classifyLead(workspaceId: string, input: LeadClassificationInput): Promise<LeadClassificationResult> {
    return this.execute(AiUsageAction.CLASSIFY_LEAD, workspaceId, input, async () => {
      const config = await this.resolveProviderConfig(workspaceId);
      return this.provider.classifyLead(input, config);
    });
  }

  async suggestReply(workspaceId: string, input: SuggestReplyInput): Promise<SuggestReplyResult> {
    return this.execute(AiUsageAction.SUGGEST_REPLY, workspaceId, input, async () => {
      const config = await this.resolveProviderConfig(workspaceId);
      return this.provider.suggestReply(input, config);
    });
  }

  async extractFields(workspaceId: string, input: ExtractFieldsInput): Promise<ExtractFieldsResult> {
    return this.execute(AiUsageAction.EXTRACT_FIELDS, workspaceId, input, async () => {
      const config = await this.resolveProviderConfig(workspaceId);
      return this.provider.extractFields(input, config);
    });
  }

  private async execute<TInput, TOutput>(
    action: AiAction,
    workspaceId: string,
    input: TInput,
    handler: () => Promise<TOutput>
  ) {
    try {
      const result = await handler();
      await this.logUsage({
        workspaceId,
        action,
        input,
        output: result,
        status: AiUsageStatus.SUCCESS
      });
      return result;
    } catch (error) {
      await this.logUsage({
        workspaceId,
        action,
        input,
        status: AiUsageStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
      });
      throw error;
    }
  }


  private async resolveProviderConfig(workspaceId: string) {
    const variables = await this.workspaceVariablesService.getWorkspaceVariablesMap(workspaceId);
    return {
      apiKey: variables.OPENAI_API_KEY,
      model: variables.OPENAI_MODEL,
      baseUrl: variables.OPENAI_BASE_URL
    };
  }

  private async logUsage(input: {
    workspaceId: string;
    action: AiAction;
    input: unknown;
    output?: unknown;
    status: AiUsageStatus;
    errorMessage?: string;
  }) {
    await this.prisma.aiUsageLog.create({
      data: {
        workspaceId: input.workspaceId,
        provider: this.provider.name,
        action: input.action,
        status: input.status,
        input: this.toJsonValue(input.input),
        output: input.output ? this.toJsonValue(input.output) : undefined,
        errorMessage: input.errorMessage
      }
    });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
