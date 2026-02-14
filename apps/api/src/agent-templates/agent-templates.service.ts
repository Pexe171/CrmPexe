import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AgentAuditAction,
  AgentTemplateStatus,
  Prisma,
  UserRole
} from "@prisma/client";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { ImportAgentTemplateDto } from "./dto/import-agent-template.dto";
import { ListAgentTemplatesQueryDto } from "./dto/list-agent-templates-query.dto";
import { N8nAgentPublisherService } from "./n8n-agent-publisher.service";

const MAX_JSON_PAYLOAD_BYTES = 512_000;

@Injectable()
export class AgentTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nPublisher: N8nAgentPublisherService
  ) {}

  async importDraft(user: AuthUser, dto: ImportAgentTemplateDto) {
    this.ensureCanImport(user);
    this.ensurePayloadSize(dto.jsonPayload);

    const validation = this.validateAgentSchema(dto.jsonPayload);

    if (!validation.valid) {
      throw new BadRequestException({
        message: "JSON inválido para importação do agent.",
        errors: validation.errors
      });
    }

    const slug = this.slugify(dto.name);

    return this.prisma.$transaction(async (tx) => {
      const existingTemplate = await tx.agentTemplate.findUnique({
        where: { slug },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } }
      });

      const nextVersion = (existingTemplate?.versions[0]?.version ?? 0) + 1;
      const template =
        existingTemplate ??
        (await tx.agentTemplate.create({
          data: {
            name: dto.name,
            slug,
            description: dto.description,
            category: dto.category,
            channel: validation.normalized.channel,
            tags: validation.normalized.tags,
            compatibility: validation.normalized.compatibility,
            allowedPlans: validation.normalized.allowedPlans,
            status: AgentTemplateStatus.DRAFT,
            createdById: user.id
          }
        }));

      const createdVersion = await tx.agentTemplateVersion.create({
        data: {
          agentTemplateId: template.id,
          version: nextVersion,
          sourceJson: dto.jsonPayload as Prisma.InputJsonValue,
          normalizedJson: validation.normalized as Prisma.InputJsonValue,
          validationReport: {
            valid: true,
            importedAt: new Date().toISOString()
          },
          createdById: user.id
        }
      });

      await tx.agentAuditLog.create({
        data: {
          actorId: user.id,
          action: AgentAuditAction.IMPORTED,
          agentTemplateId: template.id,
          versionId: createdVersion.id,
          metadataJson: {
            source: "import",
            version: nextVersion
          }
        }
      });

      if (existingTemplate) {
        await tx.agentTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            name: dto.name,
            description: dto.description,
            category: dto.category,
            channel: validation.normalized.channel,
            tags: validation.normalized.tags,
            compatibility: validation.normalized.compatibility,
            allowedPlans: validation.normalized.allowedPlans,
            status: AgentTemplateStatus.DRAFT
          }
        });
      }

      return {
        templateId: template.id,
        version: nextVersion,
        validationReport: createdVersion.validationReport,
        preview: validation.normalized
      };
    });
  }

  async publish(user: AuthUser, templateId: string) {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException("Apenas super-admin pode publicar no n8n.");
    }

    const template = await this.prisma.agentTemplate.findUnique({
      where: { id: templateId },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 }
      }
    });

    if (!template) {
      throw new NotFoundException("Agent template não encontrado.");
    }

    const latestVersion = template.versions[0];

    if (!latestVersion) {
      throw new BadRequestException("Template sem versão para publicar.");
    }

    if (latestVersion.publishedAt) {
      throw new BadRequestException(
        "Versão já publicada. Crie uma nova versão para editar/publicar novamente."
      );
    }

    const n8nResult = await this.n8nPublisher.publishAgentVersion({
      n8nWorkflowId: latestVersion.n8nWorkflowId,
      normalizedJson: latestVersion.normalizedJson as Record<string, unknown>,
      name: template.name
    });

    const workflowId =
      (n8nResult.id as string | undefined) ??
      (n8nResult.data as { id?: string } | undefined)?.id ??
      latestVersion.n8nWorkflowId;

    return this.prisma.$transaction(async (tx) => {
      const updatedVersion = await tx.agentTemplateVersion.update({
        where: { id: latestVersion.id },
        data: {
          publishedAt: new Date(),
          n8nWorkflowId: workflowId
        }
      });

      await tx.agentTemplate.update({
        where: { id: template.id },
        data: { status: AgentTemplateStatus.PUBLISHED }
      });

      await tx.agentAuditLog.create({
        data: {
          actorId: user.id,
          action: AgentAuditAction.PUBLISHED,
          agentTemplateId: template.id,
          versionId: updatedVersion.id,
          metadataJson: { workflowId }
        }
      });

      return updatedVersion;
    });
  }

  async list(user: AuthUser, query: ListAgentTemplatesQueryDto) {
    this.ensureCanImport(user);
    const where: Prisma.AgentTemplateWhereInput = {
      ...(query.status ? { status: query.status as AgentTemplateStatus } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.tags
        ? {
            tags: {
              hasSome: query.tags
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            }
          }
        : {}),
      ...(query.compatibility
        ? {
            compatibility: {
              hasSome: query.compatibility
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            }
          }
        : {})
    };

    const [total, data] = await Promise.all([
      this.prisma.agentTemplate.count({ where }),
      this.prisma.agentTemplate.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1
          }
        }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        perPage: query.perPage,
        totalPages: Math.max(1, Math.ceil(total / query.perPage))
      }
    };
  }

  async listVersions(user: AuthUser, templateId: string) {
    this.ensureCanImport(user);
    return this.prisma.agentTemplateVersion.findMany({
      where: { agentTemplateId: templateId },
      orderBy: { version: "desc" }
    });
  }

  async rollback(user: AuthUser, templateId: string, version: number, reason?: string) {
    this.ensureCanImport(user);

    const sourceVersion = await this.prisma.agentTemplateVersion.findUnique({
      where: {
        agentTemplateId_version: {
          agentTemplateId: templateId,
          version
        }
      }
    });

    if (!sourceVersion) {
      throw new NotFoundException("Versão para rollback não encontrada.");
    }

    const latestVersion = await this.prisma.agentTemplateVersion.findFirst({
      where: { agentTemplateId: templateId },
      orderBy: { version: "desc" }
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.agentTemplateVersion.create({
        data: {
          agentTemplateId: templateId,
          version: nextVersion,
          sourceJson: sourceVersion.sourceJson as Prisma.InputJsonValue,
          normalizedJson: sourceVersion.normalizedJson as Prisma.InputJsonValue,
          validationReport: {
            ...(sourceVersion.validationReport as Record<string, unknown>),
            rollbackFrom: version,
            rollbackReason: reason ?? null
          },
          createdById: user.id
        }
      });

      await tx.agentTemplate.update({
        where: { id: templateId },
        data: { status: AgentTemplateStatus.DRAFT }
      });

      await tx.agentAuditLog.create({
        data: {
          actorId: user.id,
          action: AgentAuditAction.ROLLED_BACK,
          agentTemplateId: templateId,
          versionId: created.id,
          metadataJson: { rollbackFrom: version, reason: reason ?? null }
        }
      });

      return created;
    });
  }

  private ensureCanImport(user: AuthUser) {
    if (user.role !== UserRole.ADMIN && !user.isSuperAdmin) {
      throw new ForbiddenException("Apenas admins internos podem importar drafts.");
    }
  }

  private ensurePayloadSize(payload: Record<string, unknown>) {
    const bytes = Buffer.byteLength(JSON.stringify(payload));
    if (bytes > MAX_JSON_PAYLOAD_BYTES) {
      throw new BadRequestException("Payload excede o limite de 500KB.");
    }
  }

  private validateAgentSchema(payload: Record<string, unknown>) {
    const errors: string[] = [];

    if (!Array.isArray(payload.nodes)) {
      errors.push("Campo 'nodes' deve ser um array.");
    }

    if (typeof payload.connections !== "object" || payload.connections === null) {
      errors.push("Campo 'connections' deve ser um objeto.");
    }

    if (errors.length > 0) {
      return { valid: false as const, errors, normalized: {} };
    }

    return {
      valid: true as const,
      errors: [],
      normalized: {
        name:
          typeof payload.name === "string" ? payload.name : "Agent sem nome",
        nodes: payload.nodes,
        connections: payload.connections,
        channel:
          typeof payload.channel === "string" ? payload.channel : "OMNICHANNEL",
        tags: Array.isArray(payload.tags)
          ? payload.tags.filter((item): item is string => typeof item === "string")
          : [],
        compatibility: Array.isArray(payload.compatibility)
          ? payload.compatibility.filter(
              (item): item is string => typeof item === "string"
            )
          : [],
        allowedPlans: Array.isArray(payload.allowedPlans)
          ? payload.allowedPlans.filter(
              (item): item is string => typeof item === "string"
            )
          : []
      }
    };
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}
