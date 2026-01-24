import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { IntegrationAccountStatus, IntegrationAccountType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateIntegrationAccountDto } from "./dto/create-integration-account.dto";
import { UpdateIntegrationAccountDto } from "./dto/update-integration-account.dto";
import { IntegrationCryptoService } from "./integration-crypto.service";

@Injectable()
export class IntegrationAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationCryptoService: IntegrationCryptoService
  ) {}

  async listAccounts(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const accounts = await this.prisma.integrationAccount.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      include: { secret: { select: { id: true } } },
      orderBy: { createdAt: "desc" }
    });

    return accounts.map((account) => ({
      id: account.id,
      workspaceId: account.workspaceId,
      type: account.type,
      name: account.name,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      hasSecret: Boolean(account.secret)
    }));
  }

  async createAccount(userId: string, payload: CreateIntegrationAccountDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const name = this.normalizeRequiredString(payload.name, "name");
    const type = this.parseType(payload.type);
    const status = payload.status ? this.parseStatus(payload.status) : IntegrationAccountStatus.ACTIVE;

    return this.prisma.integrationAccount.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        type,
        name,
        status
      }
    });
  }

  async updateAccount(userId: string, accountId: string, payload: UpdateIntegrationAccountDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: resolvedWorkspaceId }
    });

    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const name = payload.name !== undefined ? this.normalizeRequiredString(payload.name, "name") : undefined;
    const type = payload.type !== undefined ? this.parseType(payload.type) : undefined;
    const status = payload.status !== undefined ? this.parseStatus(payload.status) : undefined;

    return this.prisma.integrationAccount.update({
      where: { id: account.id },
      data: {
        name,
        type,
        status
      }
    });
  }

  async deleteAccount(userId: string, accountId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: resolvedWorkspaceId }
    });

    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    await this.prisma.integrationAccount.delete({
      where: { id: account.id }
    });

    return { success: true };
  }

  async upsertSecret(userId: string, accountId: string, payload: Record<string, string>, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: resolvedWorkspaceId }
    });

    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const normalizedPayload = this.normalizePayload(payload);
    const encryptedPayload = this.integrationCryptoService.encrypt(normalizedPayload);

    await this.prisma.integrationSecret.upsert({
      where: { integrationAccountId: account.id },
      create: {
        integrationAccountId: account.id,
        encryptedPayload
      },
      update: {
        encryptedPayload
      }
    });

    return { success: true };
  }

  async requestWhatsappQr(userId: string, accountId: string, workspaceId?: string) {
    const { account, secrets } = await this.getAccountWithSecrets(userId, accountId, workspaceId);

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    return this.callWhatsappGateway(account.id, secrets, "qrEndpoint", "/whatsapp/qr");
  }

  async getWhatsappStatus(userId: string, accountId: string, workspaceId?: string) {
    const { account, secrets } = await this.getAccountWithSecrets(userId, accountId, workspaceId);

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    return this.callWhatsappGateway(account.id, secrets, "statusEndpoint", "/whatsapp/status");
  }

  async requestWhatsappSmsCode(userId: string, accountId: string, phone: string, workspaceId?: string) {
    const { account, secrets } = await this.getAccountWithSecrets(userId, accountId, workspaceId);

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const normalizedPhone = this.normalizeRequiredString(phone, "phone");

    return this.callWhatsappGatewayPost(
      account.id,
      secrets,
      "smsRequestEndpoint",
      "/whatsapp/sms/request",
      { phone: normalizedPhone, method: "sms" }
    );
  }

  async verifyWhatsappSmsCode(
    userId: string,
    accountId: string,
    phone: string,
    code: string,
    workspaceId?: string
  ) {
    const { account, secrets } = await this.getAccountWithSecrets(userId, accountId, workspaceId);

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const normalizedPhone = this.normalizeRequiredString(phone, "phone");
    const normalizedCode = this.normalizeRequiredString(code, "code");

    return this.callWhatsappGatewayPost(
      account.id,
      secrets,
      "smsVerifyEndpoint",
      "/whatsapp/sms/verify",
      { phone: normalizedPhone, code: normalizedCode }
    );
  }

  private async getAccountWithSecrets(userId: string, accountId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: resolvedWorkspaceId }
    });

    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    if (account.status !== IntegrationAccountStatus.ACTIVE) {
      throw new BadRequestException("Integração está inativa.");
    }

    const secret = await this.prisma.integrationSecret.findUnique({
      where: { integrationAccountId: account.id }
    });

    if (!secret) {
      throw new BadRequestException("Segredos da integração não configurados.");
    }

    const secrets = this.integrationCryptoService.decrypt(secret.encryptedPayload);

    return { account, secrets };
  }

  private async callWhatsappGateway(
    integrationAccountId: string,
    secrets: Record<string, string>,
    endpointKey: "qrEndpoint" | "statusEndpoint",
    fallbackPath: string
  ) {
    const apiUrl = this.getRequiredSecret(secrets, "apiUrl");
    const apiToken = this.getRequiredSecret(secrets, "apiToken");
    const endpoint = secrets[endpointKey] || fallbackPath;
    const url = new URL(endpoint, apiUrl).toString();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "X-Integration-Account-Id": integrationAccountId
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadRequestException(`Falha ao consultar gateway do WhatsApp: ${errorBody}`);
    }

    const data = (await response.json()) as { qr?: string | null; status?: string | null };

    return {
      qr: data.qr ?? null,
      status: data.status ?? "connecting"
    };
  }

  private async callWhatsappGatewayPost(
    integrationAccountId: string,
    secrets: Record<string, string>,
    endpointKey: "smsRequestEndpoint" | "smsVerifyEndpoint",
    fallbackPath: string,
    payload: Record<string, string>
  ) {
    const apiUrl = this.getRequiredSecret(secrets, "apiUrl");
    const apiToken = this.getRequiredSecret(secrets, "apiToken");
    const endpoint = secrets[endpointKey] || fallbackPath;
    const url = new URL(endpoint, apiUrl).toString();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
        "X-Integration-Account-Id": integrationAccountId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadRequestException(`Falha ao consultar gateway do WhatsApp: ${errorBody}`);
    }

    try {
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      return { success: true };
    }
  }

  private normalizePayload(payload: Record<string, string>) {
    if (!payload || typeof payload !== "object") {
      throw new BadRequestException("Payload inválido.");
    }

    const entries = Object.entries(payload).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = key.trim();
      const normalizedValue = value?.toString().trim();
      if (!normalizedKey || !normalizedValue) {
        return acc;
      }
      acc[normalizedKey] = normalizedValue;
      return acc;
    }, {});

    if (Object.keys(entries).length === 0) {
      throw new BadRequestException("Payload inválido.");
    }

    return entries;
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }
    const currentWorkspaceId = await this.getCurrentWorkspaceId(userId);
    await this.ensureWorkspaceMembership(userId, currentWorkspaceId);
    return currentWorkspaceId;
  }

  private async getCurrentWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true }
    });

    if (!user?.currentWorkspaceId) {
      throw new BadRequestException("Workspace atual não definido.");
    }

    return user.currentWorkspaceId;
  }

  private async ensureWorkspaceMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    if (!membership) {
      throw new BadRequestException("Workspace inválido.");
    }
  }

  private parseType(type: IntegrationAccountType | string) {
    if (!Object.values(IntegrationAccountType).includes(type as IntegrationAccountType)) {
      throw new BadRequestException("Tipo de integração inválido.");
    }
    return type as IntegrationAccountType;
  }

  private parseStatus(status: IntegrationAccountStatus | string) {
    if (!Object.values(IntegrationAccountStatus).includes(status as IntegrationAccountStatus)) {
      throw new BadRequestException("Status de integração inválido.");
    }
    return status as IntegrationAccountStatus;
  }

  private normalizeRequiredString(value: string | undefined | null, field: string) {
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
