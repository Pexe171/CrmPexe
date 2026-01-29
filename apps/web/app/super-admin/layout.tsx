import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";
import { SUPER_ADMIN_COOKIE, normalizeSuperAdminFlag } from "@/lib/rbac";

type SuperAdminLayoutProps = {
  children: ReactNode;
};

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  const isSuperAdmin = normalizeSuperAdminFlag(
    cookieStore.get(SUPER_ADMIN_COOKIE)?.value
  );

  if (!session) {
    redirect("/login");
  }

  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
