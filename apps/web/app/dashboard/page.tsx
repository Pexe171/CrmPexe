import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";
import {
  ROLE_COOKIE,
  SUPER_ADMIN_COOKIE,
  normalizeSuperAdminFlag,
  normalizeUserRole
} from "@/lib/rbac";

import DashboardClient from "./dashboard-client";

export default function DashboardPage() {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  const role = normalizeUserRole(cookieStore.get(ROLE_COOKIE)?.value);
  const isSuperAdmin = normalizeSuperAdminFlag(
    cookieStore.get(SUPER_ADMIN_COOKIE)?.value
  );

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient role={role ?? "USER"} isSuperAdmin={isSuperAdmin} />;
}
