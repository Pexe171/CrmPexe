import {
  ExtractFieldsInput,
  ExtractFieldsResult,
  LeadClassificationInput,
  LeadClassificationResult,
  SummarizeConversationInput,
  SummarizeConversationResult,
  SuggestReplyInput,
  SuggestReplyResult
} from "../ai.types";

export interface AiProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AiProvider {
  readonly name: string;
  summarizeConversation(input: SummarizeConversationInput, config?: AiProviderConfig): Promise<SummarizeConversationResult>;
  classifyLead(input: LeadClassificationInput, config?: AiProviderConfig): Promise<LeadClassificationResult>;
  suggestReply(input: SuggestReplyInput, config?: AiProviderConfig): Promise<SuggestReplyResult>;
  extractFields(input: ExtractFieldsInput, config?: AiProviderConfig): Promise<ExtractFieldsResult>;
}
