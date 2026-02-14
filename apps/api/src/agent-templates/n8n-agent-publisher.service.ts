import { Injectable } from "@nestjs/common";

export type N8nErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "TRANSIENT_ERROR";

export class N8nPublisherError extends Error {
  constructor(
    message: string,
    public readonly code: N8nErrorCode,
    public readonly statusCode?: number
  ) {
    super(message);
  }
}

@Injectable()
export class N8nAgentPublisherService {
  private readonly token = process.env.N8N_API_TOKEN?.trim() ?? "";
  private readonly maxRetries = 3;

  private resolveBaseUrls() {
    const configured = process.env.N8N_BASE_URL?.trim();
    const localDocker =
      process.env.N8N_LOCAL_BASE_URL?.trim() ?? "http://localhost:5678";
    const internalDocker =
      process.env.N8N_INTERNAL_BASE_URL?.trim() ?? "http://n8n:5678";

    const candidates = [configured, localDocker, internalDocker].filter(
      (value): value is string => Boolean(value)
    );

    return [...new Set(candidates)];
  }

  async publishAgentVersion(version: {
    n8nWorkflowId?: string | null;
    normalizedJson: Record<string, unknown>;
    name: string;
  }) {
    const payload = this.toN8nPayload(version.normalizedJson, version.name);

    if (version.n8nWorkflowId) {
      return this.updateWorkflow(version.n8nWorkflowId, payload);
    }

    return this.requestWithRetry("/api/v1/workflows", "POST", payload);
  }

  async updateWorkflow(workflowId: string, payload: Record<string, unknown>) {
    return this.requestWithRetry(
      `/api/v1/workflows/${workflowId}`,
      "PATCH",
      payload
    );
  }

  async deactivateWorkflow(workflowId: string) {
    await this.requestWithRetry(
      `/api/v1/workflows/${workflowId}/deactivate`,
      "POST"
    );
  }

  async deleteWorkflow(workflowId: string) {
    await this.requestWithRetry(`/api/v1/workflows/${workflowId}`, "DELETE");
  }

  private toN8nPayload(
    normalizedJson: Record<string, unknown>,
    defaultName: string
  ) {
    const name =
      typeof normalizedJson.name === "string" && normalizedJson.name.trim()
        ? normalizedJson.name.trim()
        : defaultName;

    const nodes = Array.isArray(normalizedJson.nodes) ? normalizedJson.nodes : [];
    const connections =
      normalizedJson.connections && typeof normalizedJson.connections === "object"
        ? normalizedJson.connections
        : {};

    return {
      name,
      nodes,
      connections,
      settings: {
        timezone: "America/Sao_Paulo"
      }
    };
  }

  private async requestWithRetry(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown>
  ) {
    const baseUrls = this.resolveBaseUrls();

    if (baseUrls.length === 0) {
      throw new N8nPublisherError(
        "Nenhuma URL do n8n foi configurada.",
        "TRANSIENT_ERROR"
      );
    }

    let attempt = 0;
    let waitMs = 300;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      for (const baseUrl of baseUrls) {
        try {
          return await this.executeRequest(baseUrl, path, method, body);
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error("Erro desconhecido");

          if (!(error instanceof N8nPublisherError)) {
            continue;
          }

          if (error.code !== "TRANSIENT_ERROR") {
            throw error;
          }
        }
      }

      attempt += 1;

      if (attempt > this.maxRetries) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      waitMs *= 2;
    }

    if (lastError instanceof N8nPublisherError) {
      throw lastError;
    }

    throw new N8nPublisherError(
      lastError?.message ?? "Falha ao comunicar com n8n.",
      "TRANSIENT_ERROR"
    );
  }

  private async executeRequest(
    baseUrl: string,
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown>
  ) {
    let response: Response;

    try {
      response = await fetch(new URL(path, baseUrl), {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { "X-N8N-API-KEY": this.token } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (error) {
      throw new N8nPublisherError(
        error instanceof Error ? error.message : "Falha de rede com n8n.",
        "TRANSIENT_ERROR"
      );
    }

    if (response.ok) {
      if (response.status === 204) {
        return { success: true };
      }

      return (await response.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const raw = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new N8nPublisherError(
        raw || "Falha de autenticação no n8n.",
        "AUTH_ERROR",
        response.status
      );
    }

    if (response.status >= 400 && response.status < 500) {
      throw new N8nPublisherError(
        raw || "Payload inválido para n8n.",
        "VALIDATION_ERROR",
        response.status
      );
    }

    throw new N8nPublisherError(
      raw || "Erro transitório no n8n.",
      "TRANSIENT_ERROR",
      response.status
    );
  }
}
