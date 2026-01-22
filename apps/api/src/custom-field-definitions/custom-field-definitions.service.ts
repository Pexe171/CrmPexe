import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CustomFieldEntity, CustomFieldType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomFieldDefinitionDto } from "./dto/create-custom-field-definition.dto";
import { UpdateCustomFieldDefinitionDto } from "./dto/update-custom-field-definition.dto";

@Injectable()
export class CustomFieldDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDefinitions(userId: string, entity?: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const where = {
      workspaceId: resolvedWorkspaceId,
      ...(entity ? { entity: this.parseEntity(entity) } : {})
    };

    return this.prisma.customFieldDefinition.findMany({
      where,
      orderBy: [{ entity: "asc" }, { label: "asc" }]
    });
  }

  async createDefinition(userId: string, payload: CreateCustomFieldDefinitionDto, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const key = this.normalizeRequiredString(payload.key, "key");
    const label = this.normalizeRequiredString(payload.label, "label");
    const entity = this.parseEntity(payload.entity);
    const type = this.parseType(payload.type);
    const required = Boolean(payload.required);
    const options = this.normalizeOptions(payload.options, type);

    return this.prisma.customFieldDefinition.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        entity,
        key,
        label,
        type,
        required,
        options
      }
    });
  }

  async updateDefinition(
    userId: string,
    definitionId: string,
    payload: UpdateCustomFieldDefinitionDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const definition = await this.prisma.customFieldDefinition.findFirst({
      where: { id: definitionId, workspaceId: resolvedWorkspaceId }
    });

    if (!definition) {
      throw new NotFoundException("Campo customizado não encontrado.");
    }

    const key = payload.key !== undefined ? this.normalizeRequiredString(payload.key, "key") : undefined;
    const label = payload.label !== undefined ? this.normalizeRequiredString(payload.label, "label") : undefined;
    const entity = payload.entity !== undefined ? this.parseEntity(payload.entity) : undefined;
    const type = payload.type !== undefined ? this.parseType(payload.type) : undefined;
    const required = payload.required !== undefined ? Boolean(payload.required) : undefined;
    const options = payload.options !== undefined
      ? this.normalizeOptions(payload.options, type ?? definition.type)
      : undefined;

    return this.prisma.customFieldDefinition.update({
      where: { id: definition.id },
      data: {
        key,
        label,
        entity,
        type,
        required,
        options
      }
    });
  }

  async deleteDefinition(userId: string, definitionId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const definition = await this.prisma.customFieldDefinition.findFirst({
      where: { id: definitionId, workspaceId: resolvedWorkspaceId }
    });

    if (!definition) {
      throw new NotFoundException("Campo customizado não encontrado.");
    }

    await this.prisma.customFieldDefinition.delete({
      where: { id: definition.id }
    });

    return { success: true };
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }
    return this.getCurrentWorkspaceId(userId);
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

  private parseEntity(entity: CustomFieldEntity | string) {
    if (!Object.values(CustomFieldEntity).includes(entity as CustomFieldEntity)) {
      throw new BadRequestException("Entidade inválida.");
    }
    return entity as CustomFieldEntity;
  }

  private parseType(type: CustomFieldType | string) {
    if (!Object.values(CustomFieldType).includes(type as CustomFieldType)) {
      throw new BadRequestException("Tipo de campo inválido.");
    }
    return type as CustomFieldType;
  }

  private normalizeRequiredString(value: string | undefined | null, field: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} é obrigatório.`);
    }
    return trimmed;
  }

  private normalizeOptions(options: string[] | null | undefined, type: CustomFieldType) {
    if (options === undefined) {
      return undefined;
    }
    if (!options || options.length === 0) {
      if (type === CustomFieldType.SELECT || type === CustomFieldType.MULTI_SELECT) {
        throw new BadRequestException("Opções são obrigatórias para campos de seleção.");
      }
      return Prisma.JsonNull;
    }
    const normalized = options
      .map((option) => option.trim())
      .filter((option) => option.length > 0);
    if (normalized.length === 0) {
      if (type === CustomFieldType.SELECT || type === CustomFieldType.MULTI_SELECT) {
        throw new BadRequestException("Opções são obrigatórias para campos de seleção.");
      }
      return Prisma.JsonNull;
    }
    return normalized;
  }
}
