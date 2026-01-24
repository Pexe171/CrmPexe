import { SESSION_MAX_AGE } from "@/lib/auth";

export type UserRole = "ADMIN" | "USER";

export const ROLE_COOKIE = "crmpexe_role";
export const ROLE_COOKIE_MAX_AGE = SESSION_MAX_AGE;

const VALID_ROLES: UserRole[] = ["ADMIN", "USER"];

export const normalizeUserRole = (value?: string | null): UserRole | null => {
  if (!value) return null;
  const upper = value.toUpperCase() as UserRole;
  if (!VALID_ROLES.includes(upper)) return null;
  return upper;
};

export const isAdminRole = (value?: string | null) =>
  normalizeUserRole(value) === "ADMIN";

export const getDefaultDashboardPath = (value?: string | null) =>
  isAdminRole(value) ? "/admin/automations" : "/dashboard";
