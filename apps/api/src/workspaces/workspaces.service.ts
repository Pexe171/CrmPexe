import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkspace(userId: string, name: string) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new BadRequestException("Nome do workspace é obrigatório.");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const workspace = await tx.workspace.create({
        data: {
          name: trimmedName
        }
      });

      const role = await tx.role.create({
        data: {
          workspaceId: workspace.id,
          name: "Owner",
          description: "Administrador do workspace"
        }
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          roleId: role.id
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { currentWorkspaceId: workspace.id }
      });

      return workspace;
    });
  }

  async listWorkspaces(userId: string) {
    const [memberships, user] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { userId, workspace: { deletedAt: null } },
        include: {
          workspace: true
        }
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { currentWorkspaceId: true }
      })
    ]);

    return {
      currentWorkspaceId: user?.currentWorkspaceId ?? null,
      workspaces: memberships.map((membership: { workspace: { id: string; name: string; createdAt: Date; updatedAt: Date } }) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        createdAt: membership.workspace.createdAt,
        updatedAt: membership.workspace.updatedAt
      }))
    };
  }

  async switchWorkspace(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
        workspace: {
          deletedAt: null
        }
      }
    });

    if (!membership) {
      throw new ForbiddenException("Você não possui acesso a este workspace.");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: userId },
        data: { currentWorkspaceId: workspaceId }
      });

      return {
        currentWorkspaceId: workspaceId
      };
    });
  }

  async exportWorkspaceData(userId: string, workspaceId: string) {
    await this.ensureWorkspaceAdmin(userId, workspaceId);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado.");
    }

    const [
      members,
      roles,
      permissions,
      rolePermissions,
      auditLogs,
      companies,
      customers,
      contacts,
      deals,
      tags,
      tagOnCompanies,
      tagOnContacts,
      tagOnDeals,
      tagOnCustomers,
      tasks,
      customFieldDefinitions,
      conversations,
      messages,
      notifications,
      activities,
      webhookSubscriptions,
      integrationAccounts,
      integrationSecrets,
      messageTemplates,
      automationInstances,
      workspaceVariables,
      subscriptions,
      aiUsageLogs
    ] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: true, role: true }
      }),
      this.prisma.role.findMany({ where: { workspaceId } }),
      this.prisma.permission.findMany({ where: { workspaceId } }),
      this.prisma.rolePermission.findMany({ where: { workspaceId } }),
      this.prisma.auditLog.findMany({ where: { workspaceId } }),
      this.prisma.company.findMany({ where: { workspaceId } }),
      this.prisma.customer.findMany({ where: { workspaceId } }),
      this.prisma.contact.findMany({ where: { workspaceId } }),
      this.prisma.deal.findMany({ where: { workspaceId } }),
      this.prisma.tag.findMany({ where: { workspaceId } }),
      this.prisma.tagOnCompany.findMany({ where: { workspaceId } }),
      this.prisma.tagOnContact.findMany({ where: { workspaceId } }),
      this.prisma.tagOnDeal.findMany({ where: { workspaceId } }),
      this.prisma.tagOnCustomer.findMany({ where: { workspaceId } }),
      this.prisma.task.findMany({ where: { workspaceId } }),
      this.prisma.customFieldDefinition.findMany({ where: { workspaceId } }),
      this.prisma.conversation.findMany({ where: { workspaceId } }),
      this.prisma.message.findMany({ where: { workspaceId } }),
      this.prisma.notification.findMany({ where: { workspaceId } }),
      this.prisma.activity.findMany({ where: { workspaceId } }),
      this.prisma.webhookSubscription.findMany({ where: { workspaceId } }),
      this.prisma.integrationAccount.findMany({ where: { workspaceId } }),
      this.prisma.integrationSecret.findMany({
        where: { integrationAccount: { workspaceId } }
      }),
      this.prisma.messageTemplate.findMany({ where: { workspaceId } }),
      this.prisma.automationInstance.findMany({ where: { workspaceId } }),
      this.prisma.workspaceVariable.findMany({ where: { workspaceId } }),
      this.prisma.subscription.findMany({ where: { workspaceId } }),
      this.prisma.aiUsageLog.findMany({ where: { workspaceId } })
    ]);

    return {
      generatedAt: new Date().toISOString(),
      workspace,
      members,
      roles,
      permissions,
      rolePermissions,
      auditLogs,
      companies,
      customers,
      contacts,
      deals,
      tags,
      tagOnCompanies,
      tagOnContacts,
      tagOnDeals,
      tagOnCustomers,
      tasks,
      customFieldDefinitions,
      conversations,
      messages,
      notifications,
      activities,
      webhookSubscriptions,
      integrationAccounts,
      integrationSecrets,
      messageTemplates,
      automationInstances,
      workspaceVariables,
      subscriptions,
      aiUsageLogs
    };
  }

  async requestWorkspaceDeletion(userId: string, workspaceId: string, reason?: string) {
    await this.ensureWorkspaceAdmin(userId, workspaceId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado.");
    }

    if (workspace.deletedAt) {
      return {
        workspaceId,
        deletedAt: workspace.deletedAt,
        retentionEndsAt: workspace.retentionEndsAt,
        reason
      };
    }

    const now = new Date();
    const retentionDays = this.getRetentionDays();
    const retentionEndsAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.workspace.update({
        where: { id: workspaceId },
        data: {
          deletedAt: now,
          retentionEndsAt
        }
      });

      await tx.user.updateMany({
        where: { currentWorkspaceId: workspaceId },
        data: { currentWorkspaceId: null }
      });
    });

    return {
      workspaceId,
      deletedAt: now,
      retentionEndsAt,
      reason
    };
  }

  private async ensureWorkspaceAdmin(userId: string, workspaceId: string) {
    const [membership, user] = await Promise.all([
      this.prisma.workspaceMember.findFirst({
        where: { userId, workspaceId },
        include: { role: true }
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isSuperAdmin: true }
      })
    ]);

    if (!membership) {
      throw new BadRequestException("Workspace inválido.");
    }

    if (user?.role === UserRole.ADMIN || user?.isSuperAdmin) {
      return;
    }

    if (membership.role?.name !== "Owner") {
      throw new ForbiddenException("Você não possui permissão para essa ação.");
    }
  }

  private getRetentionDays() {
    const parsed = Number(process.env.WORKSPACE_RETENTION_DAYS);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 30;
  }
}
