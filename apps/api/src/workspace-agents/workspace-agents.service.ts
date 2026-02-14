import { Prisma } from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import {
  AgentAuditAction,
  AgentTemplateStatus,
  UserRole
} from "@prisma/client";
import { N8nAgentPublisherService } from "../agent-templates/n8n-agent-publisher.service";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkspaceAgentsService {
  private readonly logger = new Logger(WorkspaceAgentsService.name);
  private readonly deleteOldWorkflowOnSwitch =
    process.env.N8N_DELETE_PREVIOUS_WORKFLOW_ON_ACTIVATE === "true";

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nPublisher: N8nAgentPublisherService
  ) {}

  async catalog(user: AuthUser) {
    const workspaceId = this.getWorkspaceId(user);

    const templates = await this.prisma.agentTemplate.findMany({
      where: { status: AgentTemplateStatus.PUBLISHED },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "desc" }
    });

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { code: true }
    });

    return templates.filter((template) => {
      if (template.allowedPlans.length === 0) {
        return true;
      }

      return workspace?.code
        ? template.allowedPlans.includes(workspace.code)
        : false;
    });
  }

  async activate(
    user: AuthUser,
    agentTemplateId: string,
    requestedVersion?: number,
    configJson?: Record<string, unknown>
  ) {
    const workspaceId = this.getWorkspaceId(user);

    const [template, previousActive] = await Promise.all([
      this.prisma.agentTemplate.findUnique({
        where: { id: agentTemplateId },
        include: {
          versions: {
            where: requestedVersion ? { version: requestedVersion } : undefined,
            orderBy: { version: "desc" },
            take: 1
          }
        }
      }),
      this.prisma.workspaceAgent.findFirst({
        where: { workspaceId, agentTemplateId, isActive: true },
        include: {
          agentTemplateVersion: {
            select: {
              n8nWorkflowId: true,
              version: true
            }
          }
        }
      })
    ]);

    if (!template || template.status !== AgentTemplateStatus.PUBLISHED) {
      throw new NotFoundException("Agent não disponível para ativação.");
    }

    const version = template.versions[0];

    if (!version || !version.publishedAt) {
      throw new BadRequestException("Versão ainda não publicada.");
    }

    const workspaceAgent = await this.prisma.$transaction(async (tx) => {
      await tx.workspaceAgent.updateMany({
        where: { workspaceId, agentTemplateId, isActive: true },
        data: { isActive: false, deactivatedAt: new Date() }
      });

      const created = await tx.workspaceAgent.create({
        data: {
          workspaceId,
          agentTemplateId,
          agentTemplateVersionId: version.id,
          isActive: true,
          configJson: (configJson ?? {}) as Prisma.InputJsonValue,
          activatedById: user.id
        }
      });

      await tx.agentAuditLog.create({
        data: {
          actorId: user.id,
          action: AgentAuditAction.ACTIVATED,
          agentTemplateId,
          versionId: version.id,
          workspaceId,
          metadataJson: { workspaceAgentId: created.id }
        }
      });

      return created;
    });

    const cleanup = await this.cleanupOldWorkflowAfterSwitch({
      actorId: user.id,
      workspaceId,
      agentTemplateId,
      previousWorkflowId: previousActive?.agentTemplateVersion.n8nWorkflowId,
      currentWorkflowId: version.n8nWorkflowId
    });

    return {
      workspaceAgent,
      n8nCleanup: cleanup
    };
  }

  async deactivate(user: AuthUser, agentTemplateId: string) {
    const workspaceId = this.getWorkspaceId(user);

    const active = await this.prisma.workspaceAgent.findFirst({
      where: { workspaceId, agentTemplateId, isActive: true },
      include: {
        agentTemplateVersion: {
          select: { n8nWorkflowId: true }
        }
      }
    });

    if (!active) {
      throw new NotFoundException("Nenhum agent ativo para este template.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const deactivated = await tx.workspaceAgent.update({
        where: { id: active.id },
        data: { isActive: false, deactivatedAt: new Date() }
      });

      await tx.agentAuditLog.create({
        data: {
          actorId: user.id,
          action: AgentAuditAction.DEACTIVATED,
          agentTemplateId,
          versionId: active.agentTemplateVersionId,
          workspaceId,
          metadataJson: { workspaceAgentId: active.id }
        }
      });

      return deactivated;
    });

    if (active.agentTemplateVersion.n8nWorkflowId) {
      try {
        await this.n8nPublisher.deactivateWorkflow(
          active.agentTemplateVersion.n8nWorkflowId
        );
      } catch (error) {
        this.logger.warn(
          `Falha ao desativar workflow ${active.agentTemplateVersion.n8nWorkflowId} no n8n durante deactivate do workspace.`
        );
      }
    }

    return updated;
  }

  async listWorkspaceAgents(user: AuthUser, isActive?: boolean) {
    const workspaceId = this.getWorkspaceId(user);

    return this.prisma.workspaceAgent.findMany({
      where: {
        workspaceId,
        ...(typeof isActive === "boolean" ? { isActive } : {})
      },
      include: {
        agentTemplate: true,
        agentTemplateVersion: true
      },
      orderBy: { activatedAt: "desc" }
    });
  }

  private async cleanupOldWorkflowAfterSwitch(params: {
    actorId: string;
    workspaceId: string;
    agentTemplateId: string;
    previousWorkflowId?: string | null;
    currentWorkflowId?: string | null;
  }) {
    const {
      actorId,
      workspaceId,
      agentTemplateId,
      previousWorkflowId,
      currentWorkflowId
    } = params;

    if (!previousWorkflowId || previousWorkflowId === currentWorkflowId) {
      return {
        attempted: false,
        deactivated: false,
        deleted: false,
        reason: "workflow anterior inexistente ou igual ao atual"
      };
    }

    const result = {
      attempted: true,
      deactivated: false,
      deleted: false,
      deleteEnabled: this.deleteOldWorkflowOnSwitch,
      workflowId: previousWorkflowId,
      error: null as string | null
    };

    try {
      await this.n8nPublisher.deactivateWorkflow(previousWorkflowId);
      result.deactivated = true;

      if (this.deleteOldWorkflowOnSwitch) {
        await this.n8nPublisher.deleteWorkflow(previousWorkflowId);
        result.deleted = true;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao limpar workflow anterior no n8n.";
      result.error = message;
      this.logger.warn(message);
    }

    await this.prisma.agentAuditLog.create({
      data: {
        actorId,
        action: AgentAuditAction.DEACTIVATED,
        agentTemplateId,
        workspaceId,
        metadataJson: {
          source: "switch-version-cleanup",
          ...result
        }
      }
    });

    return result;
  }

  private getWorkspaceId(user: AuthUser) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.USER) {
      if (!user.currentWorkspaceId) {
        throw new ForbiddenException("Workspace atual não encontrado no token.");
      }

      return user.currentWorkspaceId;
    }

    throw new ForbiddenException("Usuário sem acesso de workspace.");
  }
}
