import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  IntegrationAccountStatus,
  IntegrationAccountType
} from "@prisma/client";
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
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

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

  async createAccount(
    userId: string,
    payload: CreateIntegrationAccountDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const name = this.normalizeRequiredString(payload.name, "name");
    const type = this.parseType(payload.type);
    const status = payload.status
      ? this.parseStatus(payload.status)
      : IntegrationAccountStatus.ACTIVE;

    if (this.isSingleAccountType(type)) {
      const existing = await this.prisma.integrationAccount.findFirst({
        where: {
          workspaceId: resolvedWorkspaceId,
          type
        },
        select: { id: true }
      });

      if (existing) {
        throw new BadRequestException(
          "Já existe uma conta vinculada para esta mídia social neste workspace."
        );
      }
    }

    return this.prisma.integrationAccount.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        type,
        name,
        status
      }
    });
  }

  async updateAccount(
    userId: string,
    accountId: string,
    payload: UpdateIntegrationAccountDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: resolvedWorkspaceId }
    });

    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const name =
      payload.name !== undefined
        ? this.normalizeRequiredString(payload.name, "name")
        : undefined;
    const type =
      payload.type !== undefined ? this.parseType(payload.type) : undefined;
    const status =
      payload.status !== undefined
        ? this.parseStatus(payload.status)
        : undefined;

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
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

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

  async upsertSecret(
    userId: string,
    accountId: string,
    payload: Record<string, string>,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: resolvedWorkspaceId }
    });

    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const normalizedPayload = this.normalizePayload(payload);
    const encryptedPayload =
      this.integrationCryptoService.encrypt(normalizedPayload);

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

  async requestWhatsappQr(
    userId: string,
    accountId: string,
    workspaceId?: string
  ) {
    const { account, secrets } = await this.getAccountWithSecrets(
      userId,
      accountId,
      workspaceId
    );

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const missingApiConfiguration =
      this.getMissingApiConfigurationResponse(secrets);
    if (missingApiConfiguration) {
      return missingApiConfiguration;
    }

    try {
      const result = await this.callWhatsappGateway(
        account.id,
        secrets,
        "qrEndpoint",
        "/whatsapp/qr"
      );
      await this.saveSession(
        userId,
        account.id,
        secrets,
        result.status,
        result.qr
      );
      return result;
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha ao conectar com a API do WhatsApp. Verifique a URL e o token.";
      throw new BadRequestException(message);
    }
  }

  async getWhatsappStatus(
    userId: string,
    accountId: string,
    workspaceId?: string
  ) {
    const { account, secrets } = await this.getAccountWithSecrets(
      userId,
      accountId,
      workspaceId
    );

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const missingApiConfiguration =
      this.getMissingApiConfigurationResponse(secrets);
    if (missingApiConfiguration) {
      return missingApiConfiguration;
    }

    try {
      const result = await this.callWhatsappGateway(
        account.id,
        secrets,
        "statusEndpoint",
        "/whatsapp/status"
      );
      await this.saveSession(
        userId,
        account.id,
        secrets,
        result.status,
        result.qr
      );
      return result;
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha ao consultar status da API do WhatsApp. Verifique a URL e o token.";
      throw new BadRequestException(message);
    }
  }

  async connectWhatsappEvolution(
    userId: string,
    accountId: string,
    workspaceId?: string
  ) {
    const { account, secrets } = await this.getAccountWithSecrets(
      userId,
      accountId,
      workspaceId
    );

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const provider = (secrets.provider || "EVOLUTION").toUpperCase();
    if (provider !== "EVOLUTION") {
      throw new BadRequestException(
        "A conexão Evolution está disponível apenas para provider EVOLUTION."
      );
    }

    const missingApiConfiguration =
      this.getMissingApiConfigurationResponse(secrets);
    if (missingApiConfiguration) {
      return missingApiConfiguration;
    }

    const fallbackPath =
      secrets.instanceName != null
        ? `/instance/connect/${secrets.instanceName}`
        : "/whatsapp/evolution/qr";
    const result = await this.callWhatsappGateway(
      account.id,
      secrets,
      "qrEndpoint",
      fallbackPath
    );
    await this.saveSession(
      userId,
      account.id,
      secrets,
      result.status,
      result.qr
    );

    return {
      ...result,
      provider: "EVOLUTION",
      mode: "QR"
    };
  }

  /**
   * Cria instância no Evolution (Baileys/QR ou Meta Oficial) e opcionalmente retorna QR.
   */
  async createEvolutionInstance(
    userId: string,
    accountId: string,
    body: {
      type: "QR" | "OFFICIAL";
      instanceName?: string;
      metaToken?: string;
      metaPhoneNumberId?: string;
    },
    workspaceId?: string
  ): Promise<{ qr: string | null; status: string; message?: string }> {
    const { account, secrets } = await this.getAccountWithSecrets(
      userId,
      accountId,
      workspaceId
    );

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const missingApiConfiguration =
      this.getMissingApiConfigurationResponse(secrets);
    if (missingApiConfiguration) {
      return {
        qr: null,
        status: missingApiConfiguration.status,
        message: missingApiConfiguration.message
      };
    }

    const apiUrl = this.getRequiredSecret(secrets, "apiUrl").replace(/\/$/, "");
    const apiToken = this.getRequiredSecret(secrets, "apiToken");
    const instanceName =
      body.instanceName?.trim() || `CrmPexe-${accountId.slice(-8)}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: apiToken
    };

    if (body.type === "OFFICIAL") {
      const metaToken = body.metaToken?.trim();
      const metaPhoneNumberId = body.metaPhoneNumberId?.trim();
      if (!metaToken || !metaPhoneNumberId) {
        throw new BadRequestException(
          "Para API Oficial (Meta) são obrigatórios metaToken e metaPhoneNumberId."
        );
      }

      const createPayload = {
        instanceName,
        token: apiToken,
        integration: "WHATSAPP-BUSINESS",
        metaToken,
        metaPhoneNumberId
      };

      const createRes = await fetch(`${apiUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(createPayload)
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new BadRequestException(
          `Evolution API (create): ${createRes.status} - ${errText.slice(0, 200)}`
        );
      }

      await this.mergeSecretPayload(userId, account.id, {
        instanceName,
        evolutionType: "META",
        provider: "EVOLUTION"
      });

      return {
        qr: null,
        status: "created",
        message: "Instância oficial (Meta) criada. Use o painel da Meta para verificar a conexão."
      };
    }

    const createPayload = {
      instanceName,
      token: apiToken,
      integration: "WHATSAPP-BAILEYS"
    };

    const createRes = await fetch(`${apiUrl}/instance/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(createPayload)
    });

    if (!createRes.ok && createRes.status !== 403) {
      const errText = await createRes.text();
      throw new BadRequestException(
        `Evolution API (create): ${createRes.status} - ${errText.slice(0, 200)}`
      );
    }

    const instanceAlreadyExists = createRes.status === 403;
    if (!instanceAlreadyExists) {
      await this.mergeSecretPayload(userId, account.id, {
        instanceName,
        qrEndpoint: `/instance/connect/${instanceName}`,
        evolutionType: "BAILEYS",
        provider: "EVOLUTION"
      });
    } else {
      const existingSecrets = await this.getAccountWithSecrets(
        userId,
        accountId,
        workspaceId
      );
      const hasInstance =
        existingSecrets.secrets.instanceName === instanceName ||
        String(existingSecrets.secrets.qrEndpoint || "").includes(instanceName);
      if (!hasInstance) {
        await this.mergeSecretPayload(userId, account.id, {
          instanceName,
          qrEndpoint: `/instance/connect/${instanceName}`,
          evolutionType: "BAILEYS",
          provider: "EVOLUTION"
        });
      }
    }

    const connectUrl = `${apiUrl}/instance/connect/${instanceName}`;
    const connectRes = await fetch(connectUrl, { method: "GET", headers });

    if (!connectRes.ok) {
      const errText = await connectRes.text();
      throw new BadRequestException(
        `Evolution API (connect): ${connectRes.status} - ${errText.slice(0, 200)}`
      );
    }

    let connectData: { code?: string; qr?: string; status?: string };
    try {
      connectData = (await connectRes.json()) as {
        code?: string;
        qr?: string;
        status?: string;
      };
    } catch {
      return {
        qr: null,
        status: "connecting",
        message: "Instância criada. Chame 'Conectar via QR Code' para obter o QR."
      };
    }

    const qr = connectData.qr ?? connectData.code ?? null;
    await this.saveSession(userId, account.id, secrets, "connecting", qr);

    return {
      qr,
      status: "connecting"
    };
  }

  private async mergeSecretPayload(
    userId: string,
    accountId: string,
    additionalPayload: Record<string, string>,
    workspaceId?: string
  ): Promise<void> {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: resolvedWorkspaceId }
    });
    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const secret = await this.prisma.integrationSecret.findUnique({
      where: { integrationAccountId: account.id }
    });
    if (!secret) {
      throw new BadRequestException("Configure URL e token da API antes de criar a instância.");
    }

    const current = this.integrationCryptoService.decrypt(
      secret.encryptedPayload
    );
    const merged = { ...current, ...additionalPayload };
    const encryptedPayload =
      this.integrationCryptoService.encrypt(merged);

    await this.prisma.integrationSecret.update({
      where: { integrationAccountId: account.id },
      data: { encryptedPayload }
    });
  }

  async listWhatsappSessions(
    userId: string,
    accountId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const account = await this.prisma.integrationAccount.findFirst({
      where: { id: accountId, workspaceId: resolvedWorkspaceId }
    });

    if (!account) {
      throw new NotFoundException("Integração não encontrada.");
    }

    return this.prisma.whatsappSession.findMany({
      where: { integrationAccountId: account.id, profileUserId: userId },
      orderBy: { updatedAt: "desc" }
    });
  }

  async requestWhatsappSmsCode(
    userId: string,
    accountId: string,
    phone: string,
    workspaceId?: string
  ) {
    const { account, secrets } = await this.getAccountWithSecrets(
      userId,
      accountId,
      workspaceId
    );

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const missingApiConfiguration =
      this.getMissingApiConfigurationResponse(secrets);
    if (missingApiConfiguration) {
      return missingApiConfiguration;
    }

    const normalizedPhone = this.normalizeRequiredString(phone, "phone");

    return this.callWhatsappGatewayPost(
      account.id,
      secrets,
      "smsRequestEndpoint",
      "/whatsapp/sms/request",
      {
        phone: normalizedPhone,
        method: "sms"
      }
    );
  }

  async verifyWhatsappSmsCode(
    userId: string,
    accountId: string,
    phone: string,
    code: string,
    workspaceId?: string
  ) {
    const { account, secrets } = await this.getAccountWithSecrets(
      userId,
      accountId,
      workspaceId
    );

    if (account.type !== IntegrationAccountType.WHATSAPP) {
      throw new BadRequestException("Integração não é do tipo WhatsApp.");
    }

    const missingApiConfiguration =
      this.getMissingApiConfigurationResponse(secrets);
    if (missingApiConfiguration) {
      return missingApiConfiguration;
    }

    const normalizedPhone = this.normalizeRequiredString(phone, "phone");
    const normalizedCode = this.normalizeRequiredString(code, "code");

    return this.callWhatsappGatewayPost(
      account.id,
      secrets,
      "smsVerifyEndpoint",
      "/whatsapp/sms/verify",
      {
        phone: normalizedPhone,
        code: normalizedCode
      }
    );
  }

  private async saveSession(
    userId: string,
    integrationAccountId: string,
    secrets: Record<string, string>,
    status: string,
    qr?: string | null
  ) {
    const provider = (secrets.provider || "QR").toUpperCase();
    const sessionName = secrets.sessionName?.trim() || `perfil-${userId}`;

    await this.prisma.whatsappSession.upsert({
      where: {
        integrationAccountId_profileUserId_sessionName: {
          integrationAccountId,
          profileUserId: userId,
          sessionName
        }
      },
      create: {
        integrationAccountId,
        profileUserId: userId,
        provider,
        sessionName,
        status,
        qrCode: qr ?? null,
        metadata: {
          strategy: provider,
          note: "Sessão vinculada ao perfil do usuário."
        }
      },
      update: {
        provider,
        status,
        qrCode: qr ?? null,
        metadata: {
          strategy: provider,
          note: "Sessão vinculada ao perfil do usuário."
        }
      }
    });
  }

  private getMissingApiConfigurationResponse(secrets: Record<string, string>) {
    const hasApiUrl = Boolean(secrets.apiUrl?.trim());
    const hasApiToken = Boolean(secrets.apiToken?.trim());

    if (hasApiUrl && hasApiToken) {
      return null;
    }

    return {
      needsSupport: true,
      status: "missing_api_configuration",
      message:
        "A API do cliente (Evolution ou compatível) não foi configurada. Entre em contato com o suporte para finalizar a conexão do WhatsApp.",
      supportContactUrl:
        process.env.WHATSAPP_SUPPORT_URL ||
        process.env.NEXT_PUBLIC_WHATSAPP_LINK ||
        null
    };
  }

  private async getAccountWithSecrets(
    userId: string,
    accountId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

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

    const secrets = this.integrationCryptoService.decrypt(
      secret.encryptedPayload
    );

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
    let url: string;
    try {
      url = new URL(endpoint, apiUrl).toString();
    } catch {
      throw new BadRequestException(
        "URL da API do WhatsApp inválida. Verifique o formato (ex: https://sua-api.com)."
      );
    }

    const isEvolution =
      secrets.evolutionType != null ||
      (endpoint && String(endpoint).includes("/instance/"));
    const headers: Record<string, string> = {
      ...(isEvolution ? { apikey: apiToken } : { Authorization: `Bearer ${apiToken}` }),
      "X-Integration-Account-Id": integrationAccountId
    };

    let response: Response;
    try {
      response = await fetch(url, { method: "GET", headers });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de rede";
      throw new BadRequestException(
        `Não foi possível conectar na API do WhatsApp: ${msg}. Verifique se a URL está acessível.`
      );
    }

    const text = await response.text();
    if (!response.ok) {
      throw new BadRequestException(
        `API do WhatsApp respondeu com erro (${response.status}): ${text.slice(0, 200)}`
      );
    }

    let data: { qr?: string | null; status?: string | null; code?: string | null };
    try {
      data = JSON.parse(text) as {
        qr?: string | null;
        status?: string | null;
        code?: string | null;
      };
    } catch {
      throw new BadRequestException(
        "A API do WhatsApp retornou uma resposta inválida (não é JSON)."
      );
    }

    const qr = data.qr ?? data.code ?? null;
    return {
      qr,
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
      throw new BadRequestException(
        `Falha ao consultar gateway do WhatsApp: ${errorBody}`
      );
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

    const entries = Object.entries(payload).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        const normalizedKey = key.trim();
        const normalizedValue = value?.toString().trim();
        if (!normalizedKey || !normalizedValue) {
          return acc;
        }
        acc[normalizedKey] = normalizedValue;
        return acc;
      },
      {}
    );

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

  private isSingleAccountType(type: IntegrationAccountType) {
    return (
      type === IntegrationAccountType.WHATSAPP ||
      type === IntegrationAccountType.INSTAGRAM_DIRECT ||
      type === IntegrationAccountType.FACEBOOK_MESSENGER
    );
  }

  private parseType(type: IntegrationAccountType | string) {
    if (
      !Object.values(IntegrationAccountType).includes(
        type as IntegrationAccountType
      )
    ) {
      throw new BadRequestException("Tipo de integração inválido.");
    }
    return type as IntegrationAccountType;
  }

  private parseStatus(status: IntegrationAccountStatus | string) {
    if (
      !Object.values(IntegrationAccountStatus).includes(
        status as IntegrationAccountStatus
      )
    ) {
      throw new BadRequestException("Status de integração inválido.");
    }
    return status as IntegrationAccountStatus;
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
