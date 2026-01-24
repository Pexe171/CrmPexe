import { Request } from "express";
import { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  currentWorkspaceId?: string | null;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
