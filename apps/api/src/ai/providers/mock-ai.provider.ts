import { Injectable } from "@nestjs/common";
import { AiProvider } from "../interfaces/ai-provider.interface";
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

@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  async summarizeConversation(input: SummarizeConversationInput): Promise<SummarizeConversationResult> {
    if (!input.messages.length) {
      return {
        summary: "Nenhuma mensagem para resumir.",
        highlights: [],
        sentiment: "neutro"
      };
    }

    const lastMessage = input.messages[input.messages.length - 1];
    const snippet = this.truncate(lastMessage.content, 140);

    return {
      summary: `Resumo rápido: ${input.messages.length} mensagens trocadas. Última mensagem: "${snippet}"`,
      highlights: ["Cliente engajado", "Próximo passo a definir"],
      sentiment: "neutro"
    };
  }

  async classifyLead(input: LeadClassificationInput): Promise<LeadClassificationResult> {
    const combinedText = `${input.notes ?? ""} ${input.lastMessage ?? ""}`.toLowerCase();
    const isHot = this.containsAny(combinedText, ["agendar", "contratar", "fechar", "preço", "orçamento"]);
    const isWarm = this.containsAny(combinedText, ["avaliar", "entender", "cotação", "simular", "comparar"]);

    if (isHot) {
      return {
        label: "quente",
        score: 85,
        justification: "Interesse direto em orçamento ou fechamento."
      };
    }

    if (isWarm) {
      return {
        label: "morno",
        score: 60,
        justification: "Lead demonstrou interesse, mas ainda está em avaliação."
      };
    }

    return {
      label: "frio",
      score: 35,
      justification: "Poucos sinais de intenção imediata."
    };
  }

  async suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult> {
    const tone = input.tone ?? "neutro";
    const greeting = tone === "formal" ? "Olá" : tone === "informal" ? "Oi" : "Olá";
    const goalLine = input.goal ? `Nosso objetivo é ${input.goal}.` : "";

    return {
      reply: `${greeting}! Obrigado pela mensagem. ${goalLine} Posso te ajudar com mais detalhes ou enviar uma proposta?`
    };
  }

  async extractFields(input: ExtractFieldsInput): Promise<ExtractFieldsResult> {
    const fields: Record<string, string | null> = {};
    const text = input.text;
    const lowerText = text.toLowerCase();

    for (const field of input.fields) {
      const normalized = field.toLowerCase();
      if (normalized.includes("email")) {
        fields[field] = this.matchRegex(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        continue;
      }
      if (normalized.includes("telefone") || normalized.includes("celular") || normalized.includes("whatsapp")) {
        fields[field] = this.matchRegex(text, /\+?\d[\d\s().-]{7,}\d/);
        continue;
      }
      if (normalized.includes("empresa")) {
        fields[field] = this.matchAfterLabel(text, ["empresa", "companhia", "negócio"]);
        continue;
      }
      if (normalized.includes("nome")) {
        fields[field] = this.matchAfterLabel(text, ["nome", "sou", "me chamo"]);
        continue;
      }
      if (normalized.includes("cargo")) {
        fields[field] = this.matchAfterLabel(text, ["cargo", "função", "posição"]);
        continue;
      }
      if (normalized.includes("prazo")) {
        fields[field] = this.matchAfterLabel(text, ["prazo", "entrega", "quando"]);
        continue;
      }
      if (normalized.includes("valor") || normalized.includes("budget") || normalized.includes("orçamento")) {
        fields[field] = this.matchRegex(text, /R\$\s?\d+[\d.,]*/i);
        continue;
      }

      fields[field] = null;
    }

    const foundCount = Object.values(fields).filter((value) => value).length;

    return {
      fields,
      confidence: foundCount ? Math.min(0.9, 0.3 + foundCount * 0.15) : 0.2
    };
  }

  private truncate(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
  }

  private containsAny(text: string, keywords: string[]) {
    return keywords.some((keyword) => text.includes(keyword));
  }

  private matchRegex(text: string, regex: RegExp) {
    const match = text.match(regex);
    return match ? match[0] : null;
  }

  private matchAfterLabel(text: string, labels: string[]) {
    for (const label of labels) {
      const pattern = new RegExp(`${label}\s*[:\-]?\s*([^\n,.]+)`, "i");
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
