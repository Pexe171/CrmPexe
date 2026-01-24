import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";
import { ROLE_COOKIE, normalizeUserRole } from "@/lib/rbac";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  const role = normalizeUserRole(cookieStore.get(ROLE_COOKIE)?.value);

  if (!session) {
    redirect("/login");
  }

  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
