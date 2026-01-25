export type AiMessageRole = "user" | "agent" | "system";

export interface AiConversationMessage {
  role: AiMessageRole;
  content: string;
  sentAt?: Date;
}

export interface SummarizeConversationInput {
  conversationId?: string;
  messages: AiConversationMessage[];
  locale?: string;
}

export interface SummarizeConversationResult {
  summary: string;
  highlights?: string[];
  sentiment?: "positivo" | "neutro" | "negativo";
}

export interface LeadClassificationInput {
  leadName?: string;
  notes?: string;
  lastMessage?: string;
  source?: string;
}

export interface LeadClassificationResult {
  label: "frio" | "morno" | "quente";
  score: number;
  justification: string;
}

export interface SuggestReplyInput {
  lastMessage: string;
  conversationSummary?: string;
  tone?: "formal" | "informal" | "neutro";
  goal?: string;
}

export interface SuggestReplyResult {
  reply: string;
}

export interface ExtractFieldsInput {
  text: string;
  fields: string[];
}

export interface ExtractFieldsResult {
  fields: Record<string, string | null>;
  confidence: number;
}
