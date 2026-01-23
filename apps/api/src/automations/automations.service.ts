import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AutomationInstanceStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AutomationConnectorsService } from "./connectors/automation-connectors.service";
import { CreateAutomationTemplateDto } from "./dto/create-automation-template.dto";
import { InstallAutomationTemplateDto } from "./dto/install-automation-template.dto";

@Injectable()
export class AutomationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectors: AutomationConnectorsService
  ) {}

  async listTemplates() {
    return this.prisma.automationTemplate.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  async createTemplate(userId: string, payload: CreateAutomationTemplateDto) {
    const name = this.normalizeRequiredString(payload.name, "name");
    const version = this.normalizeRequiredString(payload.version, "version");
    const category = this.normalizeRequiredString(payload.category, "category");
    const description = this.normalizeOptionalString(payload.description);
    const definitionJson = this.normalizeJson(payload.definitionJson, "definitionJson");
    const requiredIntegrations = this.normalizeIntegrations(payload.requiredIntegrations);

    return this.prisma.automationTemplate.create({
      data: {
        name,
        description,
        version,
        category,
        definitionJson: definitionJson as Prisma.InputJsonValue,
        requiredIntegrations,
        createdByAdminId: userId
      }
    });
  }

  async installTemplate(
    userId: string,
    templateId: string,
    payload: InstallAutomationTemplateDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    const template = await this.prisma.automationTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException("Template de automação não encontrado.");
    }

    const configJson = this.normalizeJson(payload.configJson ?? {}, "configJson");

    const instance = await this.prisma.automationInstance.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        templateId: template.id,
        status: AutomationInstanceStatus.PENDING,
        configJson: configJson as Prisma.InputJsonValue,
        createdByUserId: userId
      }
    });

    const provisioning = await this.connectors.provisionIntegrations(template.requiredIntegrations, {
      templateId: template.id,
      workspaceId: resolvedWorkspaceId,
      config: configJson
    });

    const updatedConfig = {
      ...configJson,
      provisioning
    };

    const status =
      provisioning.status === "connected"
        ? AutomationInstanceStatus.ACTIVE
        : AutomationInstanceStatus.FAILED;

    const updatedInstance = await this.prisma.automationInstance.update({
      where: { id: instance.id },
      data: {
        status,
        configJson: updatedConfig as Prisma.InputJsonValue
      }
    });

    return {
      instance: updatedInstance,
      provisioning
    };
  }

  async listInstances(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    return this.prisma.automationInstance.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      include: { template: true },
      orderBy: { createdAt: "desc" }
    });
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

  private normalizeJson(value: Record<string, unknown> | undefined | null, field: string) {
    if (!value || Object.keys(value).length === 0) {
      if (field === "configJson") {
        return {};
      }
      throw new BadRequestException(`${field} é obrigatório.`);
    }
    return value;
  }

  private normalizeIntegrations(value?: string[]) {
    if (!value) {
      return [];
    }

    return value
      .map((integration) => integration.trim())
      .filter((integration) => integration.length > 0);
  }
}
