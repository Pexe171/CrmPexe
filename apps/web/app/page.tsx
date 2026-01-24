import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";
import { ROLE_COOKIE, getDefaultDashboardPath } from "@/lib/rbac";

export default function Home() {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  const role = cookieStore.get(ROLE_COOKIE)?.value;

  redirect(session ? getDefaultDashboardPath(role) : "/login");
}
