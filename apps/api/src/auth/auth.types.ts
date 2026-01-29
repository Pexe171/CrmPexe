import { Request } from "express";
import { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
  currentWorkspaceId?: string | null;
  isImpersonated?: boolean;
  impersonatedByUserId?: string | null;
  impersonatedWorkspaceId?: string | null;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
