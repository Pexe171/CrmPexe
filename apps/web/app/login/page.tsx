import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
