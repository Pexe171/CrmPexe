import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkspace(userId: string, name: string) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new BadRequestException("Nome do workspace é obrigatório.");
    }

    return this.prisma.$transaction(async (tx) => {
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

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId,
          action: "WORKSPACE_CREATED",
          metadata: {
            name: trimmedName
          }
        }
      });

      return workspace;
    });
  }

  async listWorkspaces(userId: string) {
    const [memberships, user] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { userId },
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
      workspaces: memberships.map((membership) => ({
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
        workspaceId
      }
    });

    if (!membership) {
      throw new ForbiddenException("Você não possui acesso a este workspace.");
    }

    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.user.findUnique({
        where: { id: userId },
        select: { currentWorkspaceId: true }
      });

      await tx.user.update({
        where: { id: userId },
        data: { currentWorkspaceId: workspaceId }
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "WORKSPACE_UPDATED",
          metadata: {
            previousWorkspaceId: previous?.currentWorkspaceId ?? null
          }
        }
      });

      return {
        currentWorkspaceId: workspaceId
      };
    });
  }
}
