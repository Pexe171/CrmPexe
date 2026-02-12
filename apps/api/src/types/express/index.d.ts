import "express";

declare module "express-serve-static-core" {
  interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    currentWorkspaceId?: string | null;
    isImpersonated?: boolean;
    impersonatedByUserId?: string | null;
    impersonatedWorkspaceId?: string | null;
  }

  interface Request {
    correlationId?: string;
    user?: AuthenticatedUser;
  }
}

export {};
