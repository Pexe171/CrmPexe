import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AutomationInstanceStatus, IntegrationAccountStatus, IntegrationAccountType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AutomationConnectorsService } from "./connectors/automation-connectors.service";
import { CreateAutomationTemplateDto } from "./dto/create-automation-template.dto";
import { InstallAutomationTemplateDto } from "./dto/install-automation-template.dto";
import { N8nClient } from "../n8n/n8n.client";
import { WorkspaceVariablesService } from "../workspace-variables/workspace-variables.service";

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

    if (status === AutomationInstanceStatus.FAILED) {
      return {
        instance: updatedInstance,
        provisioning
      };
    }

    const installation = await this.installAutomationInstance(userId, updatedInstance.id, resolvedWorkspaceId);

    return {
      instance: installation.instance,
      provisioning,
      workflow: installation.workflow
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

  async installAutomationInstance(userId: string, instanceId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const instance = await this.prisma.automationInstance.findFirst({
      where: { id: instanceId, workspaceId: resolvedWorkspaceId },
      include: { template: true }
    });

    if (!instance) {
      throw new NotFoundException("Automação não encontrada.");
    }

    const integrationAccountId = await this.getN8nIntegrationAccountId(resolvedWorkspaceId);
    const workspaceVariables = await this.workspaceVariablesService.getWorkspaceVariablesMap(resolvedWorkspaceId);
    const workflowPayload = this.buildWorkflowPayload(instance, workspaceVariables);

    const workflowResponse = instance.externalWorkflowId
      ? await this.n8nClient.updateWorkflow(integrationAccountId, instance.externalWorkflowId, workflowPayload)
      : await this.n8nClient.createWorkflow(integrationAccountId, workflowPayload);

    const externalWorkflowId = this.normalizeWorkflowId(
      workflowResponse,
      instance.externalWorkflowId
    );

    const shouldActivate = this.shouldAutoActivate(instance.configJson as Record<string, unknown>);
    if (shouldActivate) {
      await this.n8nClient.activateWorkflow(integrationAccountId, externalWorkflowId);
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

  async enableAutomation(userId: string, instanceId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const instance = await this.prisma.automationInstance.findFirst({
      where: { id: instanceId, workspaceId: resolvedWorkspaceId }
    });

    if (!instance?.externalWorkflowId) {
      throw new BadRequestException("Workflow externo não configurado.");
    }

    const integrationAccountId = await this.getN8nIntegrationAccountId(resolvedWorkspaceId);
    await this.n8nClient.activateWorkflow(integrationAccountId, instance.externalWorkflowId);

    return this.prisma.automationInstance.update({
      where: { id: instance.id },
      data: {
        enabled: true,
        status: AutomationInstanceStatus.ACTIVE
      }
    });
  }

  async disableAutomation(userId: string, instanceId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const instance = await this.prisma.automationInstance.findFirst({
      where: { id: instanceId, workspaceId: resolvedWorkspaceId }
    });

    if (!instance?.externalWorkflowId) {
      throw new BadRequestException("Workflow externo não configurado.");
    }

    const integrationAccountId = await this.getN8nIntegrationAccountId(resolvedWorkspaceId);
    await this.n8nClient.deactivateWorkflow(integrationAccountId, instance.externalWorkflowId);

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
      template: { name: string; definitionJson: Prisma.JsonValue };
      configJson: Prisma.JsonValue;
    },
    workspaceVariables: Record<string, string>
  ) {
    const definition = this.cloneJson(instance.template.definitionJson);
    const configJson = this.cloneJson(instance.configJson);

    const workflowPayload = {
      ...definition,
      name: (definition as Record<string, unknown>)?.name ?? instance.template.name,
      meta: {
        ...(definition as Record<string, unknown>)?.meta,
        automationInstanceId: instance.id,
        workspaceId: instance.workspaceId
      },
      settings: {
        ...(definition as Record<string, unknown>)?.settings,
        variables: {
          workspace: workspaceVariables,
          config: configJson
        }
      }
    };

    return workflowPayload as Record<string, unknown>;
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
    if (typeof workflowResponse.id === "string" && workflowResponse.id.trim().length > 0) {
      return workflowResponse.id.trim();
    }

    if (typeof workflowResponse.id === "number" && Number.isFinite(workflowResponse.id)) {
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
