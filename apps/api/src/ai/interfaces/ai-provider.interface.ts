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

export interface AiProvider {
  readonly name: string;
  summarizeConversation(input: SummarizeConversationInput): Promise<SummarizeConversationResult>;
  classifyLead(input: LeadClassificationInput): Promise<LeadClassificationResult>;
  suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult>;
  extractFields(input: ExtractFieldsInput): Promise<ExtractFieldsResult>;
}
