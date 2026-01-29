import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";
import { ROLE_COOKIE, SUPER_ADMIN_COOKIE, getDefaultDashboardPath } from "@/lib/rbac";

import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  const role = cookieStore.get(ROLE_COOKIE)?.value;
  const isSuperAdmin = cookieStore.get(SUPER_ADMIN_COOKIE)?.value;

  if (session) {
    redirect(getDefaultDashboardPath(role, isSuperAdmin));
  }

  return <RegisterForm />;
}
