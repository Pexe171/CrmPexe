import { Injectable } from "@nestjs/common";
import { AiUsageAction, AiUsageStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MockAiProvider } from "./providers/mock-ai.provider";
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
    private readonly provider: MockAiProvider
  ) {}

  async summarizeConversation(
    workspaceId: string,
    input: SummarizeConversationInput
  ): Promise<SummarizeConversationResult> {
    return this.execute(AiUsageAction.SUMMARIZE_CONVERSATION, workspaceId, input, () =>
      this.provider.summarizeConversation(input)
    );
  }

  async classifyLead(workspaceId: string, input: LeadClassificationInput): Promise<LeadClassificationResult> {
    return this.execute(AiUsageAction.CLASSIFY_LEAD, workspaceId, input, () => this.provider.classifyLead(input));
  }

  async suggestReply(workspaceId: string, input: SuggestReplyInput): Promise<SuggestReplyResult> {
    return this.execute(AiUsageAction.SUGGEST_REPLY, workspaceId, input, () => this.provider.suggestReply(input));
  }

  async extractFields(workspaceId: string, input: ExtractFieldsInput): Promise<ExtractFieldsResult> {
    return this.execute(AiUsageAction.EXTRACT_FIELDS, workspaceId, input, () => this.provider.extractFields(input));
  }

  private async execute<TOutput>(
    action: AiAction,
    workspaceId: string,
    input: Record<string, unknown>,
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

  private async logUsage(input: {
    workspaceId: string;
    action: AiAction;
    input: Record<string, unknown>;
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
