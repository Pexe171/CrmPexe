import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTags(userId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    return this.prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" }
    });
  }

  async createTag(userId: string, payload: CreateTagDto) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);
    const name = this.normalizeRequiredString(payload.name, "name");
    const color = this.normalizeOptionalString(payload.color);

    return this.prisma.tag.create({
      data: {
        workspaceId,
        name,
        color
      }
    });
  }

  async updateTag(userId: string, tagId: string, payload: UpdateTagDto) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, workspaceId }
    });

    if (!tag) {
      throw new NotFoundException("Tag não encontrada.");
    }

    const name = payload.name !== undefined ? this.normalizeRequiredString(payload.name, "name") : undefined;
    const color = payload.color !== undefined ? this.normalizeOptionalString(payload.color) : undefined;

    return this.prisma.tag.update({
      where: { id: tag.id },
      data: {
        name,
        color
      }
    });
  }

  async deleteTag(userId: string, tagId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, workspaceId }
    });

    if (!tag) {
      throw new NotFoundException("Tag não encontrada.");
    }

    await this.prisma.tag.delete({
      where: { id: tag.id }
    });

    return { success: true };
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
}
