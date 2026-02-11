import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  Prisma,
  UserRole,
  WorkspaceMembershipRole,
  WorkspaceMembershipStatus
} from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkspace(
    userId: string,
    payload: { name: string; password: string }
  ) {
    const trimmedName = payload.name?.trim();
    const trimmedPassword = payload.password?.trim();

    if (!trimmedName) {
      throw new BadRequestException("Nome do workspace é obrigatório.");
    }

    if (!trimmedPassword) {
      throw new BadRequestException("Senha do workspace é obrigatória.");
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const workspace = await tx.workspace.create({
        data: {
          name: trimmedName,
          code: await this.generateWorkspaceCode(tx),
          passwordHash: this.hashWorkspacePassword(trimmedPassword),
          brandName: trimmedName,
          locale: "pt-BR"
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

      await tx.workspaceMembership.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceMembershipRole.OWNER,
          status: WorkspaceMembershipStatus.APPROVED
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { currentWorkspaceId: workspace.id }
      });

      return {
        id: workspace.id,
        name: workspace.name,
        code: workspace.code,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt
      };
    });
  }

  async requestJoinWorkspace(
    userId: string,
    payload: { code: string; password: string }
  ) {
    const code = payload.code?.trim().toUpperCase();
    const password = payload.password?.trim();

    if (!code || !password) {
      throw new BadRequestException(
        "Código e senha do workspace são obrigatórios."
      );
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { code, deletedAt: null },
      select: { id: true, code: true, passwordHash: true }
    });

    if (
      !workspace ||
      workspace.passwordHash !== this.hashWorkspacePassword(password)
    ) {
      throw new BadRequestException("Código ou senha do workspace inválidos.");
    }

    const membership = await this.prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId
        }
      },
      update: {
        status: WorkspaceMembershipStatus.PENDING,
        role: WorkspaceMembershipRole.MEMBER
      },
      create: {
        workspaceId: workspace.id,
        userId,
        status: WorkspaceMembershipStatus.PENDING,
        role: WorkspaceMembershipRole.MEMBER
      },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return membership;
  }

  async listMyWorkspaces(userId: string) {
    const memberships = await this.prisma.workspaceMembership.findMany({
      where: {
        userId,
        workspace: {
          deletedAt: null
        }
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            code: true,
            brandName: true,
            locale: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return memberships.map((membership) => ({
      workspaceId: membership.workspaceId,
      workspaceName: membership.workspace.name,
      workspaceCode: membership.workspace.code,
      brandName: membership.workspace.brandName,
      locale: membership.workspace.locale,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt
    }));
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
      workspaces: memberships.map(
        (membership: {
          workspace: {
            id: string;
            name: string;
            brandName: string | null;
            locale: string;
            createdAt: Date;
            updatedAt: Date;
          };
        }) => ({
          id: membership.workspace.id,
          name: membership.workspace.name,
          brandName: membership.workspace.brandName,
          locale: membership.workspace.locale,
          createdAt: membership.workspace.createdAt,
          updatedAt: membership.workspace.updatedAt
        })
      )
    };
  }

  async getCurrentWorkspace(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: resolvedWorkspaceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        brandName: true,
        brandLogoUrl: true,
        brandPrimaryColor: true,
        brandSecondaryColor: true,
        customDomain: true,
        locale: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado.");
    }

    return workspace;
  }

  async updateWorkspaceBranding(
    userId: string,
    workspaceId: string,
    payload: {
      brandName?: string | null;
      brandLogoUrl?: string | null;
      brandPrimaryColor?: string | null;
      brandSecondaryColor?: string | null;
      customDomain?: string | null;
      locale?: string | null;
    }
  ) {
    await this.ensureWorkspaceAdmin(userId, workspaceId);
    const resolvedLocale =
      payload.locale === undefined
        ? undefined
        : (this.normalizeOptionalString(payload.locale) ?? "pt-BR");

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        brandName: this.normalizeOptionalString(payload.brandName),
        brandLogoUrl: this.normalizeOptionalString(payload.brandLogoUrl),
        brandPrimaryColor: this.normalizeOptionalString(
          payload.brandPrimaryColor
        ),
        brandSecondaryColor: this.normalizeOptionalString(
          payload.brandSecondaryColor
        ),
        customDomain: this.normalizeOptionalString(payload.customDomain),
        locale: resolvedLocale
      },
      select: {
        id: true,
        name: true,
        brandName: true,
        brandLogoUrl: true,
        brandPrimaryColor: true,
        brandSecondaryColor: true,
        customDomain: true,
        locale: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return updated;
  }

  async updateWorkspaceMemberPolicies(params: {
    requesterId: string;
    workspaceId: string;
    memberUserId: string;
    allowedTagIds?: string[];
    allowedUnitIds?: string[];
  }) {
    await this.ensureWorkspaceAdmin(params.requesterId, params.workspaceId);

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: params.workspaceId, userId: params.memberUserId }
    });

    if (!membership) {
      throw new NotFoundException("Membro do workspace não encontrado.");
    }

    return this.prisma.workspaceMember.update({
      where: { id: membership.id },
      data: {
        allowedTagIds: params.allowedTagIds ?? membership.allowedTagIds,
        allowedUnitIds: params.allowedUnitIds ?? membership.allowedUnitIds
      },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        allowedTagIds: true,
        allowedUnitIds: true,
        updatedAt: true
      }
    });
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

  async requestWorkspaceDeletion(
    userId: string,
    workspaceId: string,
    reason?: string
  ) {
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
    const retentionEndsAt = new Date(
      now.getTime() + retentionDays * 24 * 60 * 60 * 1000
    );

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

  private async ensureWorkspaceMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    if (!membership) {
      throw new BadRequestException("Workspace inválido.");
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

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private getRetentionDays() {
    const parsed = Number(process.env.WORKSPACE_RETENTION_DAYS);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 30;
  }

  private hashWorkspacePassword(password: string) {
    return createHash("sha256").update(password).digest("hex");
  }

  private async generateWorkspaceCode(tx: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = randomBytes(3).toString("hex").toUpperCase();
      const existing = await tx.workspace.findUnique({
        where: { code },
        select: { id: true }
      });

      if (!existing) {
        return code;
      }
    }

    throw new BadRequestException(
      "Não foi possível gerar um código de workspace único."
    );
  }
}
