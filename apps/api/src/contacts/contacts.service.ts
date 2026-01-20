import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async listContacts(userId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    return this.prisma.contact.findMany({
      where: { workspaceId },
      include: { company: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async getContact(userId: string, contactId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
      include: { company: true }
    });

    if (!contact) {
      throw new NotFoundException("Contato não encontrado.");
    }

    return contact;
  }

  async createContact(userId: string, payload: CreateContactDto) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);
    const name = payload.name?.trim();

    if (!name) {
      throw new BadRequestException("Nome do contato é obrigatório.");
    }

    const companyId = await this.resolveCompanyId(workspaceId, payload.companyId);
    const email = this.normalizeOptionalString(payload.email);
    const phone = this.normalizeOptionalString(payload.phone);

    return this.prisma.contact.create({
      data: {
        workspaceId,
        name,
        email,
        phone,
        companyId,
        customFields: payload.customFields ?? undefined
      },
      include: { company: true }
    });
  }

  async updateContact(userId: string, contactId: string, payload: UpdateContactDto) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId }
    });

    if (!contact) {
      throw new NotFoundException("Contato não encontrado.");
    }

    let name: string | undefined;
    if (payload.name !== undefined) {
      const trimmedName = payload.name?.trim();
      if (!trimmedName) {
        throw new BadRequestException("Nome do contato é obrigatório.");
      }
      name = trimmedName;
    }

    const email = payload.email !== undefined ? this.normalizeOptionalString(payload.email) : undefined;
    const phone = payload.phone !== undefined ? this.normalizeOptionalString(payload.phone) : undefined;
    const companyId =
      payload.companyId !== undefined ? await this.resolveCompanyId(workspaceId, payload.companyId) : undefined;

    return this.prisma.contact.update({
      where: { id: contact.id },
      data: {
        name,
        email,
        phone,
        companyId,
        customFields: payload.customFields ?? undefined
      },
      include: { company: true }
    });
  }

  async deleteContact(userId: string, contactId: string) {
    const workspaceId = await this.getCurrentWorkspaceId(userId);

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId }
    });

    if (!contact) {
      throw new NotFoundException("Contato não encontrado.");
    }

    await this.prisma.contact.delete({
      where: { id: contact.id }
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

  private async resolveCompanyId(workspaceId: string, companyId?: string | null) {
    if (companyId === undefined) {
      return undefined;
    }

    if (companyId === null) {
      return null;
    }

    const trimmedId = companyId.trim();
    if (!trimmedId) {
      return null;
    }

    const company = await this.prisma.company.findFirst({
      where: { id: trimmedId, workspaceId },
      select: { id: true }
    });

    if (!company) {
      throw new BadRequestException("Empresa vinculada inválida.");
    }

    return company.id;
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
