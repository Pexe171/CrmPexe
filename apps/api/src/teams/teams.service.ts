import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AddTeamMemberDto } from "./dto/add-team-member.dto";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { UpdateTeamMemberDto } from "./dto/update-team-member.dto";

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTeams(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    return this.prisma.team.findMany({
      where: { workspaceId: resolvedWorkspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
  }

  async createTeam(
    userId: string,
    payload: CreateTeamDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const name = this.normalizeRequiredString(payload.name, "name");
    const description = this.normalizeOptionalString(payload.description);

    return this.prisma.team.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        name,
        description: description ?? undefined
      }
    });
  }

  async updateTeam(
    userId: string,
    teamId: string,
    payload: UpdateTeamDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, workspaceId: resolvedWorkspaceId }
    });

    if (!team) {
      throw new NotFoundException("Time não encontrado.");
    }

    const data: { name?: string; description?: string | null } = {};
    if (payload.name !== undefined) {
      data.name = this.normalizeRequiredString(payload.name, "name");
    }
    if (payload.description !== undefined) {
      data.description = this.normalizeOptionalString(payload.description);
    }

    return this.prisma.team.update({
      where: { id: team.id },
      data
    });
  }

  async deleteTeam(userId: string, teamId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, workspaceId: resolvedWorkspaceId }
    });

    if (!team) {
      throw new NotFoundException("Time não encontrado.");
    }

    await this.prisma.team.delete({
      where: { id: team.id }
    });

    return { success: true };
  }

  async addMember(
    userId: string,
    teamId: string,
    payload: AddTeamMemberDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, workspaceId: resolvedWorkspaceId }
    });

    if (!team) {
      throw new NotFoundException("Time não encontrado.");
    }

    await this.ensureWorkspaceMembership(payload.userId, resolvedWorkspaceId);

    return this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: payload.userId,
        position: payload.position ?? 0,
        isActive: payload.isActive ?? true
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  async updateMember(
    userId: string,
    teamId: string,
    memberId: string,
    payload: UpdateTeamMemberDto,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const member = await this.prisma.teamMember.findFirst({
      where: {
        id: memberId,
        team: {
          id: teamId,
          workspaceId: resolvedWorkspaceId
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!member) {
      throw new NotFoundException("Membro do time não encontrado.");
    }

    const data: { position?: number; isActive?: boolean } = {};
    if (payload.position !== undefined) {
      data.position = payload.position;
    }
    if (payload.isActive !== undefined) {
      data.isActive = payload.isActive;
    }

    return this.prisma.teamMember.update({
      where: { id: member.id },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  async removeMember(
    userId: string,
    teamId: string,
    memberId: string,
    workspaceId?: string
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(
      userId,
      workspaceId
    );

    const member = await this.prisma.teamMember.findFirst({
      where: {
        id: memberId,
        team: {
          id: teamId,
          workspaceId: resolvedWorkspaceId
        }
      }
    });

    if (!member) {
      throw new NotFoundException("Membro do time não encontrado.");
    }

    await this.prisma.teamMember.delete({
      where: { id: member.id }
    });

    return { success: true };
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
}
