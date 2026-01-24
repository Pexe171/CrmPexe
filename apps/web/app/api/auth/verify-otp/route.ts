import { NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import {
  ROLE_COOKIE,
  ROLE_COOKIE_MAX_AGE,
  normalizeUserRole
} from "@/lib/rbac";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.email || !body?.code) {
    return NextResponse.json(
      { message: "E-mail e código são obrigatórios." },
      { status: 400 }
    );
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "URL da API não configurada." },
      { status: 500 }
    );
  }

  let apiResponse: Response;

  try {
    apiResponse = await fetch(new URL("/api/auth/verify-otp", apiBaseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, code: body.code }),
      credentials: "include"
    });
  } catch (error) {
    console.error("Erro ao conectar na API de autenticação:", error);
    return NextResponse.json(
      {
        message:
          "Não foi possível conectar à API. Verifique se o backend está rodando e se NEXT_PUBLIC_API_URL está correto."
      },
      { status: 502 }
    );
  }

  const apiPayload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: apiPayload?.message ?? "Código inválido." },
      { status: apiResponse.status }
    );
  }

  const response = NextResponse.json({ ok: true, user: apiPayload ?? null });
  const headersWithCookies = apiResponse.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    typeof headersWithCookies.getSetCookie === "function"
      ? headersWithCookies.getSetCookie()
      : headersWithCookies.get("set-cookie")
        ? [headersWithCookies.get("set-cookie") as string]
        : [];

  setCookies.filter(Boolean).forEach((cookie) => {
    response.headers.append("set-cookie", cookie);
  });

  const role = normalizeUserRole(apiPayload?.role) ?? "USER";

  response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });

  response.cookies.set(ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ROLE_COOKIE_MAX_AGE
  });

  return response;
}
