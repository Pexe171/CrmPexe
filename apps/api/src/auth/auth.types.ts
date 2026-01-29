import { Request } from "express";
import { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
  currentWorkspaceId?: string | null;
  impersonatorId?: string | null;
  supportWorkspaceId?: string | null;
  supportMode?: boolean;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
