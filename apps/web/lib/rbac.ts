import { SESSION_MAX_AGE } from "@/lib/auth";

export type UserRole = "ADMIN" | "USER";

export const ROLE_COOKIE = "crmpexe_role";
export const SUPER_ADMIN_COOKIE = "crmpexe_super_admin";
export const SUPPORT_MODE_COOKIE = "crmpexe_support_mode";
export const ROLE_COOKIE_MAX_AGE = SESSION_MAX_AGE;
export const SUPER_ADMIN_COOKIE_MAX_AGE = SESSION_MAX_AGE;
export const SUPPORT_MODE_COOKIE_MAX_AGE = SESSION_MAX_AGE;

const VALID_ROLES: UserRole[] = ["ADMIN", "USER"];

export const normalizeUserRole = (value?: string | null): UserRole | null => {
  if (!value) return null;
  const upper = value.toUpperCase() as UserRole;
  if (!VALID_ROLES.includes(upper)) return null;
  return upper;
};

export const isAdminRole = (value?: string | null) =>
  normalizeUserRole(value) === "ADMIN";

export const normalizeSuperAdminFlag = (value?: string | null) =>
  value === "true";

export const normalizeSupportModeFlag = (value?: string | null) =>
  value === "true";

export const getDefaultDashboardPath = (
  role?: string | null,
  superAdmin?: string | null
) => {
  if (normalizeSuperAdminFlag(superAdmin)) {
    return "/super-admin";
  }

  return isAdminRole(role) ? "/admin/automations" : "/dashboard";
};
