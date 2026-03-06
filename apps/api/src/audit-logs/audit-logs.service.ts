import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceContextService } from "../common/workspace/workspace-context.service";
import { normalizeWorkspaceId } from "../common/workspace/workspace.util";
import { AuthUser } from "../auth/auth.types";
import { AuditLogAction } from "./audit-log.types";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
type AuditScope = "workspace" | "global";

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService
  ) {}

  async listAuditLogs(
    user: AuthUser,
    page?: number,
    perPage?: number,
    workspaceId?: string,
    scope?: AuditScope
  ) {
    const safePage = Number.isFinite(page)
      ? Math.max(page as number, 1)
      : DEFAULT_PAGE;
    const safePerPage = Number.isFinite(perPage)
      ? Math.min(Math.max(perPage as number, 1), MAX_PER_PAGE)
      : DEFAULT_PER_PAGE;
    const skip = (safePage - 1) * safePerPage;

    const globalScopeRequested = scope === "global";
    const canReadGlobalScope =
      user.role === UserRole.ADMIN && globalScopeRequested;

    if (globalScopeRequested && user.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        "Escopo global disponível apenas para administradores."
      );
    }

    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    let where: Prisma.AuditLogWhereInput;

    if (canReadGlobalScope) {
      where = normalizedWorkspaceId
        ? { workspaceId: normalizedWorkspaceId }
        : {};
    } else {
      const currentWorkspaceId = await this.workspaceContext.resolveWorkspaceId(
        user.id,
        normalizedWorkspaceId
      );

      if (!currentWorkspaceId) {
        throw new BadRequestException("Workspace atual não definido.");
      }

      where = { workspaceId: currentWorkspaceId };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: safePerPage
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data: items,
      meta: {
        page: safePage,
        perPage: safePerPage,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safePerPage),
        scope: canReadGlobalScope ? "global" : "workspace"
      }
    };
  }

  async record(payload: {
    workspaceId: string;
    userId: string;
    action: AuditLogAction;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    const metadata =
      payload.metadata === undefined
        ? undefined
        : this.convertObjectToInputJson(payload.metadata);

    return this.prisma.auditLog.create({
      data: {
        workspaceId: payload.workspaceId,
        userId: payload.userId,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId,
        metadata
      }
    });
  }


  private convertObjectToInputJson(value: Record<string, unknown>): Prisma.InputJsonObject {
    const jsonObject: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, entry] of Object.entries(value)) {
      jsonObject[key] = this.convertUnknownToInputJson(entry);
    }

    return jsonObject;
  }

  private convertUnknownToInputJson(value: unknown): Prisma.InputJsonValue | null {
    if (value === null) {
      return null;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.convertUnknownToInputJson(entry));
    }

    if (this.isPlainObject(value)) {
      return this.convertObjectToInputJson(value);
    }

    throw new BadRequestException("metadata contém valores inválidos para JSON.");
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /** Delegates to WorkspaceContextService for reuse; kept for backward compatibility. */
  async resolveWorkspaceId(userId: string, workspaceId?: string) {
    return this.workspaceContext.resolveWorkspaceId(userId, workspaceId);
  }
}
