import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AiProvider, AiProviderConfig } from "../interfaces/ai-provider.interface";
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

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = "openai";


  async summarizeConversation(
    input: SummarizeConversationInput,
    config?: AiProviderConfig
  ): Promise<SummarizeConversationResult> {
    if (!input.messages.length) {
      return {
        summary: "Nenhuma mensagem para resumir.",
        highlights: [],
        sentiment: "neutro"
      };
    }

    return this.requestJson<SummarizeConversationResult>({
      systemPrompt:
        "Você é um assistente de CRM. Responda SOMENTE JSON válido com campos: summary (string), highlights (string[]), sentiment ('positivo'|'neutro'|'negativo').",
      userPrompt: `Locale: ${input.locale ?? "pt-BR"}\nMensagens:\n${JSON.stringify(input.messages)}`,
      fallback: {
        summary: "Não foi possível gerar resumo no momento.",
        highlights: [],
        sentiment: "neutro"
      }
    }, config);
  }

  async classifyLead(
    input: LeadClassificationInput,
    config?: AiProviderConfig
  ): Promise<LeadClassificationResult> {
    return this.requestJson<LeadClassificationResult>({
      systemPrompt:
        "Classifique o lead e responda SOMENTE JSON válido com: label ('frio'|'morno'|'quente'), score (0-100), justification (string curta).",
      userPrompt: JSON.stringify(input),
      fallback: {
        label: "frio",
        score: 0,
        justification: "Não foi possível classificar o lead no momento."
      }
    }, config);
  }

  async suggestReply(
    input: SuggestReplyInput,
    config?: AiProviderConfig
  ): Promise<SuggestReplyResult> {
    return this.requestJson<SuggestReplyResult>({
      systemPrompt:
        "Gere uma sugestão de resposta de atendimento e responda SOMENTE JSON válido com o campo reply (string).",
      userPrompt: JSON.stringify(input),
      fallback: {
        reply:
          "Olá! Recebi sua mensagem e já vou te ajudar com as próximas informações."
      }
    }, config);
  }

  async extractFields(
    input: ExtractFieldsInput,
    config?: AiProviderConfig
  ): Promise<ExtractFieldsResult> {
    return this.requestJson<ExtractFieldsResult>({
      systemPrompt:
        "Extraia campos do texto e responda SOMENTE JSON válido com: fields (objeto chave=>valor string|null) e confidence (0 a 1). Use as chaves exatamente como recebidas.",
      userPrompt: JSON.stringify(input),
      fallback: {
        fields: input.fields.reduce<Record<string, string | null>>((acc, field) => {
          acc[field] = null;
          return acc;
        }, {}),
        confidence: 0
      }
    }, config);
  }

  private async requestJson<T>(
    input: {
      systemPrompt: string;
      userPrompt: string;
      fallback: T;
    },
    config?: AiProviderConfig
  ): Promise<T> {
    const raw = await this.chat(input.systemPrompt, input.userPrompt, config);

    try {
      return JSON.parse(this.normalizeJson(raw)) as T;
    } catch {
      return input.fallback;
    }
  }

  private async chat(
    systemPrompt: string,
    userPrompt: string,
    config?: AiProviderConfig
  ) {
    const apiKey = config?.apiKey?.trim() ?? process.env.OPENAI_API_KEY?.trim();
    const baseUrl =
      config?.baseUrl?.trim() ?? process.env.OPENAI_BASE_URL?.trim() ?? "https://api.openai.com/v1";
    const model = config?.model?.trim() ?? process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

    if (!apiKey) {
      throw new ServiceUnavailableException(
        "OPENAI_API_KEY não configurada para provedor de IA."
      );
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadRequestException(`Falha na IA (${this.name}): ${errorBody}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new BadRequestException("Resposta vazia do provedor de IA.");
    }

    return content;
  }

  private normalizeJson(content: string) {
    const trimmed = content.trim();
    if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
      return trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
    }
    return trimmed;
  }
}
