import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { IntegrationAccountType } from "@prisma/client";
import { ExternalCallLoggerService } from "../common/logging/external-call-logger.service";
import { IntegrationCryptoService } from "../integration-accounts/integration-crypto.service";
import { PrismaService } from "../prisma/prisma.service";

type N8nRequestOptions = {
  method: "GET" | "POST" | "PATCH";
  body?: Record<string, unknown>;
};

@Injectable()
export class N8nClient {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationCryptoService: IntegrationCryptoService,
    private readonly externalCallLogger: ExternalCallLoggerService
  ) {}

  async listWorkflows(integrationAccountId: string) {
    return this.request(integrationAccountId, "/api/v1/workflows", {
      method: "GET"
    });
  }

  async createWorkflow(
    integrationAccountId: string,
    payload: Record<string, unknown>
  ) {
    const normalizedPayload = this.normalizePayload(payload, "payload");

    return this.request(integrationAccountId, "/api/v1/workflows", {
      method: "POST",
      body: normalizedPayload
    });
  }

  async updateWorkflow(
    integrationAccountId: string,
    workflowId: string,
    payload: Record<string, unknown>
  ) {
    const normalizedWorkflowId = this.normalizeRequiredString(
      workflowId,
      "workflowId"
    );
    const normalizedPayload = this.normalizePayload(payload, "payload");

    return this.request(
      integrationAccountId,
      `/api/v1/workflows/${normalizedWorkflowId}`,
      {
        method: "PATCH",
        body: normalizedPayload
      }
    );
  }

  async activateWorkflow(integrationAccountId: string, workflowId: string) {
    const normalizedWorkflowId = this.normalizeRequiredString(
      workflowId,
      "workflowId"
    );

    return this.request(
      integrationAccountId,
      `/api/v1/workflows/${normalizedWorkflowId}/activate`,
      {
        method: "POST"
      }
    );
  }

  async deactivateWorkflow(integrationAccountId: string, workflowId: string) {
    const normalizedWorkflowId = this.normalizeRequiredString(
      workflowId,
      "workflowId"
    );

    return this.request(
      integrationAccountId,
      `/api/v1/workflows/${normalizedWorkflowId}/deactivate`,
      {
        method: "POST"
      }
    );
  }

  private async request(
    integrationAccountId: string,
    path: string,
    options: N8nRequestOptions
  ) {
    const { baseUrl, apiKey, workspaceId } =
      await this.getCredentials(integrationAccountId);
    const url = new URL(path, baseUrl).toString();

    const start = Date.now();
    let status: number | undefined;
    let errorMessage: string | undefined;

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": apiKey
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      status = response.status;

      if (!response.ok) {
        const errorBody = await response.text();
        errorMessage = errorBody;
        throw new BadRequestException(`Falha ao chamar n8n: ${errorBody}`);
      }

      if (response.status === 204) {
        return { success: true };
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error && !errorMessage) {
        errorMessage = error.message;
      }
      throw error;
    } finally {
      this.externalCallLogger.log({
        system: "n8n",
        operation: "request",
        method: options.method,
        url,
        status,
        durationMs: Date.now() - start,
        success: !errorMessage,
        workspaceId,
        errorMessage
      });
    }
  }

  private async getCredentials(integrationAccountId: string) {
    const normalizedAccountId = this.normalizeRequiredString(
      integrationAccountId,
      "integrationAccountId"
    );

    const account = await this.prisma.integrationAccount.findUnique({
      where: { id: normalizedAccountId },
      include: { secret: true }
    });

    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    if (account.type !== IntegrationAccountType.N8N) {
      throw new BadRequestException("Integração não é do tipo N8N.");
    }

    if (!account.secret) {
      throw new BadRequestException("Segredos da integração não configurados.");
    }

    const secrets = this.integrationCryptoService.decrypt(
      account.secret.encryptedPayload
    );

    return {
      workspaceId: account.workspaceId,
      baseUrl: this.getRequiredSecret(secrets, "baseUrl"),
      apiKey: this.getRequiredSecret(secrets, "apiKey")
    };
  }

  private normalizePayload(payload: Record<string, unknown>, field: string) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestException(`${field} inválido.`);
    }

    return payload;
  }

  private normalizeRequiredString(
    value: string | undefined | null,
    field: string
  ) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} é obrigatório.`);
    }
    return trimmed;
  }

  private getRequiredSecret(secrets: Record<string, string>, key: string) {
    const value = secrets[key]?.trim();
    if (!value) {
      throw new BadRequestException(`Segredo ${key} é obrigatório.`);
    }
    return value;
  }
}
