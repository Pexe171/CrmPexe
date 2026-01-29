import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  async createImpersonationToken(payload: {
    superAdminId: string;
    userId: string;
    workspaceId: string;
    reason?: string;
  }) {
    const workspaceId = payload.workspaceId.trim();
    const userId = payload.userId.trim();

    if (!workspaceId || !userId) {
      throw new BadRequestException("Workspace e usuário são obrigatórios.");
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
      include: { user: true }
    });

    if (!membership) {
      throw new NotFoundException("Usuário não pertence ao workspace informado.");
    }

    const tokenPayload = await this.authService.issueImpersonationToken({
      userId: membership.user.id,
      email: membership.user.email,
      role: membership.user.role,
      impersonatedByUserId: payload.superAdminId,
      impersonatedWorkspaceId: workspaceId
    });

    await this.auditLogsService.record({
      workspaceId,
      userId: payload.superAdminId,
      action: "IMPERSONATION_STARTED",
      entity: "User",
      entityId: membership.user.id,
      metadata: {
        reason: payload.reason ?? null,
        impersonatedWorkspaceId: workspaceId,
        impersonatedUserEmail: membership.user.email
      }
    });

    return {
      accessToken: tokenPayload.accessToken,
      expiresIn: tokenPayload.expiresIn,
      targetUser: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        role: membership.user.role
      }
    };
  }

  async listWorkspaceMembers(workspaceId: string) {
    const trimmedWorkspaceId = workspaceId.trim();

    if (!trimmedWorkspaceId) {
      throw new BadRequestException("Workspace é obrigatório.");
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: trimmedWorkspaceId },
      select: { id: true }
    });

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado.");
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: trimmedWorkspaceId },
      include: { user: true }
    });

    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.user.role
    }));
  }
}
