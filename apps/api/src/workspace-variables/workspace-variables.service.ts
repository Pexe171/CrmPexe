import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IntegrationCryptoService } from "../integration-accounts/integration-crypto.service";
import { UpsertWorkspaceVariableDto } from "./dto/upsert-workspace-variable.dto";

type WorkspaceVariableSummary = {
  id: string;
  key: string;
  value: string | null;
  isSensitive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class WorkspaceVariablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationCryptoService: IntegrationCryptoService
  ) {}

  async listVariables(userId: string, workspaceId?: string): Promise<WorkspaceVariableSummary[]> {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const variables = await this.prisma.workspaceVariable.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      orderBy: { key: "asc" }
    });

    return variables.map((variable) => this.toSummary(variable));
  }

  async upsertVariable(userId: string, payload: UpsertWorkspaceVariableDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const key = this.normalizeRequiredString(payload.key, "key");
    const isSensitive = Boolean(payload.isSensitive);
    const value = this.normalizeOptionalString(payload.value);

    if (isSensitive && !value) {
      throw new BadRequestException("value é obrigatório para variáveis sensíveis.");
    }

    const encryptedValue = isSensitive && value ? this.encryptValue(value) : null;

    const variable = await this.prisma.workspaceVariable.upsert({
      where: {
        workspaceId_key: {
          workspaceId: resolvedWorkspaceId,
          key
        }
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        key,
        value: isSensitive ? null : value,
        isSensitive,
        encryptedValue
      },
      update: {
        value: isSensitive ? null : value,
        isSensitive,
        encryptedValue
      }
    });

    return this.toSummary(variable);
  }

  async getWorkspaceVariablesMap(workspaceId: string): Promise<Record<string, string>> {
    const variables = await this.prisma.workspaceVariable.findMany({
      where: { workspaceId }
    });

    return variables.reduce<Record<string, string>>((acc, variable) => {
      if (variable.isSensitive) {
        if (variable.encryptedValue) {
          acc[variable.key] = this.decryptValue(variable.encryptedValue);
        }
      } else if (variable.value) {
        acc[variable.key] = variable.value;
      }
      return acc;
    }, {});
  }

  private encryptValue(value: string) {
    const encryptedPayload = this.integrationCryptoService.encrypt({ value });
    return encryptedPayload;
  }

  private decryptValue(encryptedValue: string) {
    const decrypted = this.integrationCryptoService.decrypt(encryptedValue);
    return this.normalizeRequiredString(decrypted.value, "value");
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

  private normalizeRequiredString(value: string | undefined | null, field: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} é obrigatório.`);
    }
    return trimmed;
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toSummary(variable: {
    id: string;
    key: string;
    value: string | null;
    isSensitive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): WorkspaceVariableSummary {
    return {
      id: variable.id,
      key: variable.key,
      value: variable.isSensitive ? null : variable.value ?? null,
      isSensitive: variable.isSensitive,
      createdAt: variable.createdAt,
      updatedAt: variable.updatedAt
    };
  }
}
