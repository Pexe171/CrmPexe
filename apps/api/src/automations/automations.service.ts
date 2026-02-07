import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AutomationAccessStatus,
  AutomationInstanceStatus,
  IntegrationAccountStatus,
  IntegrationAccountType,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AutomationConnectorsService } from "./connectors/automation-connectors.service";
import { CreateAutomationTemplateDto } from "./dto/create-automation-template.dto";
import { CreateAutomationTemplateVersionDto } from "./dto/create-automation-template-version.dto";
import { InstallAutomationTemplateDto } from "./dto/install-automation-template.dto";
import { UpdateAutomationInstanceVersionDto } from "./dto/update-automation-instance-version.dto";
import { N8nClient } from "../n8n/n8n.client";
import { WorkspaceVariablesService } from "../workspace-variables/workspace-variables.service";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

@Injectable()
export class AutomationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectors: AutomationConnectorsService,
    private readonly n8nClient: N8nClient,
    private readonly workspaceVariablesService: WorkspaceVariablesService
  ) {}

  async listTemplates() {
    return this.prisma.automationTemplate.findMany({
      include: { currentVersion: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async createTemplate(userId: string, payload: CreateAutomationTemplateDto) {
    const name = this.normalizeRequiredString(payload.name, "name");
    const version = this.normalizeRequiredString(payload.version, "version");
    const category = this.normalizeRequiredString(payload.category, "category");
    const description = this.normalizeOptionalString(payload.description);
    const changelog = this.normalizeOptionalString(payload.changelog);
    const definitionJson = this.normalizeJson(
      payload.definitionJson,
      "definitionJson"
    );
    const requiredIntegrations = this.normalizeIntegrations(
      payload.requiredIntegrations
    );

    return this.prisma.$transaction(async (transaction) => {
      const template = await transaction.automationTemplate.create({
        data: {
          name,
          description,
          version,
          changelog,
          category,
          definitionJson: definitionJson as Prisma.InputJsonValue,
          requiredIntegrations,
          createdByAdminId: userId
        }
      });

      const versionEntry = await transaction.automationTemplateVersion.create({
        data: {
          templateId: template.id,
          version,
          changelog,
          definitionJson: definitionJson as Prisma.InputJsonValue,
          requiredIntegrations,
          createdByAdminId: userId
        }
      });

      return transaction.automationTemplate.update({
        where: { id: template.id },
        data: {
          currentVersionId: versionEntry.id
        },
        include: { currentVersion: true }
      });
    });
  }

  async listTemplateVersions(templateId: string) {
    const template = await this.prisma.automationTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException("Template de automação não encontrado.");
    }

    return this.prisma.automationTemplateVersion.findMany({
      where: { templateId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createTemplateVersion(
    userId: string,
    templateId: string,
    payload: CreateAutomationTemplateVersionDto
  ) {
    const version = this.normalizeRequiredString(payload.version, "version");
    const changelog = this.normalizeOptionalString(payload.changelog);
    const definitionJson = this.normalizeJson(
      payload.definitionJson,
      "definitionJson"
    );
    const requiredIntegrations = this.normalizeIntegrations(
      payload.requiredIntegrations
    );

    const template = await this.prisma.automationTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException("Template de automação não encontrado.");
    }

    const name = payload.name
      ? this.normalizeRequiredString(payload.name, "name")
      : template.name;
    const description =
      payload.description !== undefined
        ? this.normalizeOptionalString(payload.description)
        : template.description;
    const category = payload.category
      ? this.normalizeRequiredString(payload.category, "category")
      : template.category;

    return this.prisma.$transaction(async (transaction) => {
      const versionEntry = await transaction.automationTemplateVersion.create({
        data: {
          templateId,
          version,
          changelog,
          definitionJson: definitionJson as Prisma.InputJsonValue,
          requiredIntegrations,
          createdByAdminId: userId
        }
      });

      const updatedTemplate = await transaction.automationTemplate.update({
        where: { id: templateId },
        data: {
          name,
          description,
          category,
          version,
          changelog,
          definitionJson: definitionJson as Prisma.InputJsonValue,
          requiredIntegrations,
          currentVersionId: versionEntry.id
        },
        include: { currentVersion: true }
      });

      return {
        template: updatedTemplate,
        version: versionEntry
      };
    });
  }

  async installTemplate(
    userId: string,
    templateId: string,
    payload: InstallAutomationTemplateDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const template = await this.prisma.automationTemplate.findUnique({
      where: { id: templateId },
      include: { currentVersion: true }
    });

    if (!template) {
      throw new NotFoundException("Template de automação não encontrado.");
    }

    await this.ensureTemplateAccess(userId, resolvedWorkspaceId, templateId);

    const templateVersion = await this.resolveTemplateVersion(
      template,
      payload.versionId,
      payload.version
    );
    const templateSnapshot = this.getTemplateSnapshot(
      template,
      templateVersion
    );

    const configJson = this.normalizeJson(
      payload.configJson ?? {},
      "configJson"
    );

    const instance = await this.prisma.automationInstance.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        templateId: template.id,
        templateVersionId: templateVersion?.id ?? template.currentVersionId,
        status: AutomationInstanceStatus.PENDING_CONFIG,
        configJson: configJson as Prisma.InputJsonValue,
        createdByUserId: userId
      }
    });

    const provisioning = await this.connectors.provisionIntegrations(
      templateSnapshot.requiredIntegrations,
      {
        templateId: template.id,
        workspaceId: resolvedWorkspaceId,
        config: configJson
      }
    );

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

    if (status === AutomationInstanceStatus.FAILED) {
      return {
        instance: updatedInstance,
        provisioning
      };
    }

    const installation = await this.installAutomationInstance(
      userId,
      updatedInstance.id,
      resolvedWorkspaceId
    );

    return {
      instance: installation.instance,
      provisioning,
      workflow: installation.workflow
    };
  }

  async requestTemplateAccess(
    userId: string,
    templateId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const template = await this.prisma.automationTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException("Template de automação não encontrado.");
    }

    const existingAccess = await this.prisma.automationAccess.findFirst({
      where: {
        workspaceId: resolvedWorkspaceId,
        templateId,
        status: AutomationAccessStatus.APPROVED
      }
    });

    if (existingAccess) {
      return {
        status: AutomationAccessStatus.APPROVED,
        accessId: existingAccess.id
      };
    }

    const request = await this.prisma.automationAccessRequest.upsert({
      where: {
        workspaceId_templateId: {
          workspaceId: resolvedWorkspaceId,
          templateId
        }
      },
      update: {
        status: AutomationAccessStatus.PENDING,
        requestedByUserId: userId
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        templateId,
        requestedByUserId: userId,
        status: AutomationAccessStatus.PENDING
      }
    });

    return {
      status: request.status,
      requestId: request.id
    };
  }

  async grantTemplateAccess(
    adminId: string,
    templateId: string,
    workspaceId: string
  ) {
    const normalizedWorkspaceId = workspaceId.trim();
    if (!normalizedWorkspaceId) {
      throw new BadRequestException("Workspace não informado.");
    }

    const [template, workspace] = await Promise.all([
      this.prisma.automationTemplate.findUnique({ where: { id: templateId } }),
      this.prisma.workspace.findUnique({ where: { id: normalizedWorkspaceId } })
    ]);

    if (!template) {
      throw new NotFoundException("Template de automação não encontrado.");
    }

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado.");
    }

    return this.prisma.$transaction(async (transaction) => {
      const access = await transaction.automationAccess.upsert({
        where: {
          workspaceId_templateId: {
            workspaceId: normalizedWorkspaceId,
            templateId
          }
        },
        update: {
          status: AutomationAccessStatus.APPROVED,
          grantedByAdminId: adminId
        },
        create: {
          workspaceId: normalizedWorkspaceId,
          templateId,
          status: AutomationAccessStatus.APPROVED,
          grantedByAdminId: adminId
        }
      });

      await transaction.automationAccessRequest.updateMany({
        where: { workspaceId: normalizedWorkspaceId, templateId },
        data: { status: AutomationAccessStatus.APPROVED }
      });

      return access;
    });
  }

  async listInstances(
    userId: string,
    workspaceId?: string,
    page?: number,
    perPage?: number
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const safePage = Number.isFinite(page)
      ? Math.max(page as number, 1)
      : DEFAULT_PAGE;
    const safePerPage = Number.isFinite(perPage)
      ? Math.min(Math.max(perPage as number, 1), MAX_PER_PAGE)
      : DEFAULT_PER_PAGE;
    const skip = (safePage - 1) * safePerPage;

    const where = { workspaceId: resolvedWorkspaceId };

    const [items, total] = await Promise.all([
      this.prisma.automationInstance.findMany({
        where,
        include: {
          template: { include: { currentVersion: true } },
          templateVersion: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: safePerPage
      }),
      this.prisma.automationInstance.count({ where })
    ]);

    return {
      data: items,
      meta: {
        page: safePage,
        perPage: safePerPage,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safePerPage)
      }
    };
  }

  async installAutomationInstance(
    userId: string,
    instanceId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const instance = await this.prisma.automationInstance.findFirst({
      where: { id: instanceId, workspaceId: resolvedWorkspaceId },
      include: {
        template: { include: { currentVersion: true } },
        templateVersion: true
      }
    });

    if (!instance) {
      throw new NotFoundException("Automação não encontrada.");
    }

    const integrationAccountId =
      await this.getN8nIntegrationAccountId(resolvedWorkspaceId);
    const workspaceVariables =
      await this.workspaceVariablesService.getWorkspaceVariablesMap(
        resolvedWorkspaceId
      );
    const workflowPayload = this.buildWorkflowPayload(
      instance,
      workspaceVariables
    );

    const workflowResponse = instance.externalWorkflowId
      ? await this.n8nClient.updateWorkflow(
          integrationAccountId,
          instance.externalWorkflowId,
          workflowPayload
        )
      : await this.n8nClient.createWorkflow(
          integrationAccountId,
          workflowPayload
        );

    const externalWorkflowId = this.normalizeWorkflowId(
      workflowResponse,
      instance.externalWorkflowId
    );

    const shouldActivate = this.shouldAutoActivate(
      instance.configJson as Record<string, unknown>
    );
    if (shouldActivate) {
      await this.n8nClient.activateWorkflow(
        integrationAccountId,
        externalWorkflowId
      );
    }

    const updatedInstance = await this.prisma.automationInstance.update({
      where: { id: instance.id },
      data: {
        status: AutomationInstanceStatus.ACTIVE,
        externalWorkflowId,
        enabled: shouldActivate
      },
      include: { template: true }
    });

    return {
      instance: updatedInstance,
      workflow: workflowResponse
    };
  }

  async updateAutomationInstanceVersion(
    userId: string,
    instanceId: string,
    payload: UpdateAutomationInstanceVersionDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const instance = await this.prisma.automationInstance.findFirst({
      where: { id: instanceId, workspaceId: resolvedWorkspaceId },
      include: { template: { include: { currentVersion: true } } }
    });

    if (!instance) {
      throw new NotFoundException("Automação não encontrada.");
    }

    const template = instance.template;
    const templateVersion = await this.resolveTemplateVersion(
      template,
      payload.versionId
    );

    if (!templateVersion) {
      throw new NotFoundException("Versão do template não encontrada.");
    }

    await this.prisma.automationInstance.update({
      where: { id: instance.id },
      data: {
        templateVersionId: templateVersion.id
      }
    });

    return this.installAutomationInstance(
      userId,
      instance.id,
      resolvedWorkspaceId
    );
  }

  async enableAutomation(
    userId: string,
    instanceId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const instance = await this.prisma.automationInstance.findFirst({
      where: { id: instanceId, workspaceId: resolvedWorkspaceId }
    });

    if (!instance?.externalWorkflowId) {
      throw new BadRequestException("Workflow externo não configurado.");
    }

    const integrationAccountId =
      await this.getN8nIntegrationAccountId(resolvedWorkspaceId);
    await this.n8nClient.activateWorkflow(
      integrationAccountId,
      instance.externalWorkflowId
    );

    return this.prisma.automationInstance.update({
      where: { id: instance.id },
      data: {
        enabled: true,
        status: AutomationInstanceStatus.ACTIVE
      }
    });
  }

  async disableAutomation(
    userId: string,
    instanceId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const instance = await this.prisma.automationInstance.findFirst({
      where: { id: instanceId, workspaceId: resolvedWorkspaceId }
    });

    if (!instance?.externalWorkflowId) {
      throw new BadRequestException("Workflow externo não configurado.");
    }

    const integrationAccountId =
      await this.getN8nIntegrationAccountId(resolvedWorkspaceId);
    await this.n8nClient.deactivateWorkflow(
      integrationAccountId,
      instance.externalWorkflowId
    );

    return this.prisma.automationInstance.update({
      where: { id: instance.id },
      data: {
        enabled: false
      }
    });
  }

  private buildWorkflowPayload(
    instance: {
      id: string;
      workspaceId: string;
      template: {
        name: string;
        definitionJson: Prisma.JsonValue;
        currentVersion?: { definitionJson: Prisma.JsonValue } | null;
      };
      templateVersion?: { definitionJson: Prisma.JsonValue } | null;
      configJson: Prisma.JsonValue;
    },
    workspaceVariables: Record<string, string>
  ) {
    const definitionJson = this.resolveDefinitionJson(instance);
    const definition = this.cloneJson(definitionJson);
    const configJson = this.cloneJson(instance.configJson);
    const definitionRecord = this.asRecord(definition);
    const metaFromDefinition = this.asRecord(definitionRecord.meta);
    const settingsFromDefinition = this.asRecord(definitionRecord.settings);

    const workflowPayload = {
      ...definitionRecord,
      name: definitionRecord.name ?? instance.template.name,
      meta: {
        ...metaFromDefinition,
        automationInstanceId: instance.id,
        workspaceId: instance.workspaceId
      },
      settings: {
        ...settingsFromDefinition,
        variables: {
          workspace: workspaceVariables,
          config: configJson
        }
      }
    };

    return workflowPayload as Record<string, unknown>;
  }

  private resolveDefinitionJson(instance: {
    template: {
      definitionJson: Prisma.JsonValue;
      currentVersion?: { definitionJson: Prisma.JsonValue } | null;
    };
    templateVersion?: { definitionJson: Prisma.JsonValue } | null;
  }) {
    if (instance.templateVersion?.definitionJson) {
      return instance.templateVersion.definitionJson;
    }

    if (instance.template.currentVersion?.definitionJson) {
      return instance.template.currentVersion.definitionJson;
    }

    return instance.template.definitionJson;
  }

  private getTemplateSnapshot(
    template: {
      definitionJson: Prisma.JsonValue;
      requiredIntegrations: string[];
    },
    templateVersion?: {
      definitionJson: Prisma.JsonValue;
      requiredIntegrations: string[];
    } | null
  ) {
    if (templateVersion) {
      return {
        definitionJson: templateVersion.definitionJson,
        requiredIntegrations: templateVersion.requiredIntegrations
      };
    }

    return {
      definitionJson: template.definitionJson,
      requiredIntegrations: template.requiredIntegrations
    };
  }

  private async resolveTemplateVersion(
    template: {
      id: string;
      currentVersionId?: string | null;
      currentVersion?: {
        id: string;
        definitionJson: Prisma.JsonValue;
        requiredIntegrations: string[];
      } | null;
    },
    versionId?: string,
    version?: string
  ) {
    if (versionId) {
      const versionEntry =
        await this.prisma.automationTemplateVersion.findFirst({
          where: { id: versionId, templateId: template.id }
        });

      if (!versionEntry) {
        throw new NotFoundException("Versão do template não encontrada.");
      }

      return versionEntry;
    }

    if (version) {
      const versionEntry =
        await this.prisma.automationTemplateVersion.findFirst({
          where: { templateId: template.id, version }
        });

      if (!versionEntry) {
        throw new NotFoundException("Versão do template não encontrada.");
      }

      return versionEntry;
    }

    if (template.currentVersion) {
      return template.currentVersion;
    }

    if (template.currentVersionId) {
      return this.prisma.automationTemplateVersion.findUnique({
        where: { id: template.currentVersionId }
      });
    }

    return this.prisma.automationTemplateVersion.findFirst({
      where: { templateId: template.id },
      orderBy: { createdAt: "desc" }
    });
  }

  private shouldAutoActivate(configJson: Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(configJson, "autoActivate")) {
      return Boolean(configJson.autoActivate);
    }
    return true;
  }

  private async getN8nIntegrationAccountId(workspaceId: string) {
    const integration = await this.prisma.integrationAccount.findFirst({
      where: {
        workspaceId,
        type: IntegrationAccountType.N8N,
        status: IntegrationAccountStatus.ACTIVE
      },
      orderBy: { createdAt: "desc" }
    });

    if (!integration) {
      throw new BadRequestException("Integração n8n ativa não encontrada.");
    }

    return integration.id;
  }

  private normalizeWorkflowId(
    workflowResponse: Record<string, unknown>,
    fallbackWorkflowId?: string | null
  ) {
    if (
      typeof workflowResponse.id === "string" &&
      workflowResponse.id.trim().length > 0
    ) {
      return workflowResponse.id.trim();
    }

    if (
      typeof workflowResponse.id === "number" &&
      Number.isFinite(workflowResponse.id)
    ) {
      return String(workflowResponse.id);
    }

    if (fallbackWorkflowId) {
      return fallbackWorkflowId;
    }

    throw new BadRequestException("ID do workflow não retornado pelo n8n.");
  }

  private cloneJson(value: Prisma.JsonValue) {
    return value ? JSON.parse(JSON.stringify(value)) : {};
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
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

  private async ensureTemplateAccess(
    userId: string,
    workspaceId: string,
    templateId: string
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true }
    });

    if (user?.isSuperAdmin) {
      return;
    }

    const access = await this.prisma.automationAccess.findFirst({
      where: {
        workspaceId,
        templateId,
        status: AutomationAccessStatus.APPROVED
      }
    });

    if (!access) {
      throw new ForbiddenException(
        "Acesso ao template não liberado para este workspace."
      );
    }
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

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeJson(
    value: Record<string, unknown> | undefined | null,
    field: string
  ) {
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
