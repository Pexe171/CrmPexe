import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { AuthenticatedRequest } from "../auth/auth.types";
import {
  AuditEntityMetadata,
  AUDIT_ENTITY_METADATA
} from "./audit-log.decorator";
import { AuditLogsService } from "./audit-logs.service";
import { AuditLogAction } from "./audit-log.types";

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditEntityMetadata>(
      AUDIT_ENTITY_METADATA,
      context.getHandler()
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const action = metadata.action ?? this.mapAction(request.method);

    if (!action || !request.user?.id) {
      return next.handle();
    }

    return next.handle().pipe(
      mergeMap(async (data) => {
        const workspaceId = await this.resolveWorkspaceId(
          metadata,
          request,
          data
        );
        const entityId = this.resolveValue(metadata.entityId, request, data);

        if (!workspaceId || !entityId) {
          return data;
        }

        await this.auditLogsService.record({
          workspaceId,
          userId: request.user.id,
          action,
          entity: metadata.entity,
          entityId,
          metadata: metadata.metadata?.(request, data)
        });

        return data;
      })
    );
  }

  private mapAction(method?: string): AuditLogAction | null {
    switch (method?.toUpperCase()) {
      case "POST":
        return "CREATE";
      case "PUT":
      case "PATCH":
        return "UPDATE";
      case "DELETE":
        return "DELETE";
      default:
        return null;
    }
  }

  private async resolveWorkspaceId(
    metadata: AuditEntityMetadata,
    request: AuthenticatedRequest,
    response: unknown
  ) {
    if (!metadata.workspaceId) {
      return null;
    }

    if (metadata.workspaceId.source === "user") {
      return this.auditLogsService.resolveWorkspaceId(
        request.user.id,
        this.getWorkspaceHeader(request)
      );
    }

    return this.resolveValue(metadata.workspaceId, request, response);
  }

  private resolveValue(
    source:
      | {
          source: "param" | "body" | "response" | "user";
          key?: string;
        }
      | undefined,
    request: AuthenticatedRequest,
    response: unknown
  ): string | null {
    if (!source || !source.key) {
      return null;
    }

    const container = this.getSourceContainer(source.source, request, response);
    if (!container) {
      return null;
    }

    const value = this.getValueByPath(container, source.key);
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
    return null;
  }

  private getSourceContainer(
    source: "param" | "body" | "response" | "user",
    request: AuthenticatedRequest,
    response: unknown
  ) {
    switch (source) {
      case "param":
        return request.params;
      case "body":
        return request.body;
      case "response":
        return response;
      case "user":
        return request.user;
      default:
        return null;
    }
  }

  private getWorkspaceHeader(request: AuthenticatedRequest) {
    const header = request.headers["x-workspace-id"];
    if (Array.isArray(header)) {
      return header[0];
    }
    return header;
  }

  private getValueByPath(target: unknown, path: string) {
    return path.split(".").reduce((value, key) => {
      if (!value || typeof value !== "object") {
        return null;
      }
      return (value as Record<string, unknown>)[key] ?? null;
    }, target as unknown);
  }
}
