import { SetMetadata } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types";
import { AuditLogAction } from "./audit-log.types";
import type { Prisma } from "@prisma/client";

export const AUDIT_ENTITY_METADATA = "audit_entity_metadata";

export type AuditEntityMetadata = {
  entity: string;
  action?: AuditLogAction;
  entityId?: {
    source: "param" | "body" | "response";
    key: string;
  };
  workspaceId?: {
    source: "param" | "body" | "response" | "user";
    key?: string;
  };
  metadata?: (request: AuthenticatedRequest, response: unknown) => Prisma.InputJsonValue | undefined;
};

export const AuditEntity = (metadata: AuditEntityMetadata) => SetMetadata(AUDIT_ENTITY_METADATA, metadata);
