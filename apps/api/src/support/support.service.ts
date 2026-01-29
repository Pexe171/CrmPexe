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
        name: membership.user.name
      }
    };
  }
}
