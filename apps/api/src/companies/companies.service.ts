import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanies(userId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    return this.prisma.company.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });
  }

  async getCompany(userId: string, companyId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, workspaceId }
    });

    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    return company;
  }

  async createCompany(userId: string, payload: CreateCompanyDto) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);
    const name = payload.name?.trim();

    if (!name) {
      throw new BadRequestException("Nome da empresa é obrigatório.");
    }

    const domain = this.normalizeOptionalString(payload.domain);
    const phone = this.normalizeOptionalString(payload.phone);

    return this.prisma.company.create({
      data: {
        workspaceId,
        name,
        domain,
        phone,
        customFields: payload.customFields ?? undefined
      }
    });
  }

  async updateCompany(userId: string, companyId: string, payload: UpdateCompanyDto) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, workspaceId }
    });

    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    let name: string | undefined;
    if (payload.name !== undefined) {
      const trimmedName = payload.name?.trim();
      if (!trimmedName) {
        throw new BadRequestException("Nome da empresa é obrigatório.");
      }
      name = trimmedName;
    }

    const domain = payload.domain !== undefined ? this.normalizeOptionalString(payload.domain) : undefined;
    const phone = payload.phone !== undefined ? this.normalizeOptionalString(payload.phone) : undefined;

    return this.prisma.company.update({
      where: { id: company.id },
      data: {
        name,
        domain,
        phone,
        customFields: payload.customFields ?? undefined
      }
    });
  }

  async deleteCompany(userId: string, companyId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, workspaceId }
    });

    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    await this.prisma.company.delete({
      where: { id: company.id }
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

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
