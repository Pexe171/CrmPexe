import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { CustomFieldEntity, CustomFieldType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanies(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    return this.prisma.company.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      orderBy: { createdAt: "desc" }
    });
  }

  async getCompany(userId: string, companyId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, workspaceId: resolvedWorkspaceId }
    });

    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    return company;
  }

  async createCompany(
    userId: string,
    payload: CreateCompanyDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const name = payload.name?.trim();

    if (!name) {
      throw new BadRequestException("Nome da empresa é obrigatório.");
    }

    const domain = this.normalizeOptionalString(payload.domain);
    const phone = this.normalizeOptionalString(payload.phone);
    await this.validateCustomFields(resolvedWorkspaceId, payload.customFields);
    const customFields = payload.customFields ?? undefined;

    return this.prisma.company.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        name,
        domain,
        phone,
        customFields: customFields as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateCompany(
    userId: string,
    companyId: string,
    payload: UpdateCompanyDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    if (payload.version === undefined) {
      throw new BadRequestException("Versão da empresa é obrigatória.");
    }

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, workspaceId: resolvedWorkspaceId }
    });

    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    if (company.version !== payload.version) {
      throw new ConflictException("Empresa foi atualizada por outro usuário.");
    }

    let name: string | undefined;
    if (payload.name !== undefined) {
      const trimmedName = payload.name?.trim();
      if (!trimmedName) {
        throw new BadRequestException("Nome da empresa é obrigatório.");
      }
      name = trimmedName;
    }

    const domain =
      payload.domain !== undefined
        ? this.normalizeOptionalString(payload.domain)
        : undefined;
    const phone =
      payload.phone !== undefined
        ? this.normalizeOptionalString(payload.phone)
        : undefined;
    if (payload.customFields !== undefined) {
      await this.validateCustomFields(
        resolvedWorkspaceId,
        payload.customFields
      );
    }
    const customFields = payload.customFields ?? undefined;

    const updated = await this.prisma.company.updateMany({
      where: {
        id: company.id,
        workspaceId: resolvedWorkspaceId,
        version: payload.version
      },
      data: {
        name,
        domain,
        phone,
        customFields: customFields as Prisma.InputJsonValue | undefined,
        version: { increment: 1 }
      }
    });

    if (updated.count === 0) {
      throw new ConflictException("Empresa foi atualizada por outro usuário.");
    }

    const refreshed = await this.prisma.company.findFirst({
      where: { id: company.id, workspaceId: resolvedWorkspaceId }
    });

    if (!refreshed) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    return refreshed;
  }

  async deleteCompany(userId: string, companyId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const result = await this.prisma.company.updateMany({
      where: { id: companyId, workspaceId: resolvedWorkspaceId },
      data: { deletedAt: new Date(), version: { increment: 1 } }
    });

    if (result.count === 0) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    return { success: true };
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

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async validateCustomFields(
    workspaceId: string,
    customFields?: Record<string, unknown> | null
  ) {
    if (customFields === undefined) {
      return;
    }

    if (
      customFields !== null &&
      (Array.isArray(customFields) || typeof customFields !== "object")
    ) {
      throw new BadRequestException("customFields deve ser um objeto.");
    }

    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: { workspaceId, entity: CustomFieldEntity.COMPANY }
    });

    const definitionMap = new Map(
      definitions.map((definition) => [definition.key, definition])
    );
    const payloadFields = customFields ?? {};

    for (const key of Object.keys(payloadFields)) {
      if (!definitionMap.has(key)) {
        throw new BadRequestException(
          `Campo customizado '${key}' não configurado.`
        );
      }
    }

    for (const definition of definitions) {
      const value = (payloadFields as Record<string, unknown>)[definition.key];
      if (
        definition.required &&
        (value === undefined || value === null || value === "")
      ) {
        throw new BadRequestException(
          `Campo customizado '${definition.key}' é obrigatório.`
        );
      }
      if (value === undefined || value === null) {
        continue;
      }

      this.validateCustomFieldValue(
        definition.key,
        definition.type,
        definition.options,
        value
      );
    }
  }

  private validateCustomFieldValue(
    key: string,
    type: CustomFieldType,
    options: unknown,
    value: unknown
  ) {
    switch (type) {
      case CustomFieldType.TEXT:
        if (typeof value !== "string") {
          throw new BadRequestException(
            `Campo customizado '${key}' deve ser texto.`
          );
        }
        return;
      case CustomFieldType.NUMBER:
        if (typeof value !== "number" || Number.isNaN(value)) {
          throw new BadRequestException(
            `Campo customizado '${key}' deve ser número.`
          );
        }
        return;
      case CustomFieldType.BOOLEAN:
        if (typeof value !== "boolean") {
          throw new BadRequestException(
            `Campo customizado '${key}' deve ser booleano.`
          );
        }
        return;
      case CustomFieldType.DATE: {
        const date = new Date(value as string);
        if (Number.isNaN(date.getTime())) {
          throw new BadRequestException(
            `Campo customizado '${key}' deve ser data válida.`
          );
        }
        return;
      }
      case CustomFieldType.SELECT: {
        if (typeof value !== "string") {
          throw new BadRequestException(
            `Campo customizado '${key}' deve ser texto.`
          );
        }
        const optionsList = Array.isArray(options) ? options : [];
        if (optionsList.length > 0 && !optionsList.includes(value)) {
          throw new BadRequestException(
            `Campo customizado '${key}' possui valor inválido.`
          );
        }
        return;
      }
      case CustomFieldType.MULTI_SELECT: {
        if (!Array.isArray(value)) {
          throw new BadRequestException(
            `Campo customizado '${key}' deve ser lista.`
          );
        }
        const optionsList = Array.isArray(options) ? options : [];
        for (const entry of value) {
          if (typeof entry !== "string") {
            throw new BadRequestException(
              `Campo customizado '${key}' deve conter textos.`
            );
          }
          if (optionsList.length > 0 && !optionsList.includes(entry)) {
            throw new BadRequestException(
              `Campo customizado '${key}' possui valor inválido.`
            );
          }
        }
        return;
      }
      default:
        return;
    }
  }
}
