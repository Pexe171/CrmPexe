import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth";

import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  const session = cookies().get(SESSION_COOKIE);

  if (session) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
}
