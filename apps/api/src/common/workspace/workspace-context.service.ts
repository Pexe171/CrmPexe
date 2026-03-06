import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { normalizeWorkspaceId } from "./workspace.util";

/**
 * Serviço centralizado para resolver workspace do usuário (header ou atual) e validar membership.
 * Use em vez de duplicar resolveWorkspaceId em cada módulo.
 */
@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve o workspaceId efetivo: do parâmetro (se fornecido e o usuário tiver acesso) ou do workspace atual do usuário.
   * @returns workspaceId ou null se o usuário não tiver workspace atual definido
   */
  async resolveWorkspaceId(userId: string, workspaceId?: string | null): Promise<string | null> {
    const normalized = normalizeWorkspaceId(workspaceId);
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }

    const currentWorkspaceId = await this.getCurrentWorkspaceId(userId);
    if (!currentWorkspaceId) {
      return null;
    }

    await this.ensureWorkspaceMembership(userId, currentWorkspaceId);
    return currentWorkspaceId;
  }

  async getCurrentWorkspaceId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true }
    });
    return user?.currentWorkspaceId ?? null;
  }

  /**
   * Garante que o usuário pertence ao workspace; lança BadRequestException caso contrário.
   */
  async ensureWorkspaceMembership(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });
    if (!membership) {
      throw new BadRequestException("Workspace inválido.");
    }
  }
}
