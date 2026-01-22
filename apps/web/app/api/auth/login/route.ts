import { NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { message: "E-mail e senha são obrigatórios." },
      { status: 400 }
    );
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "URL da API não configurada." },
      { status: 500 }
    );
  }

  const apiResponse = await fetch(new URL("/api/auth/login", apiBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    credentials: "include"
  });

  const apiPayload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: apiPayload?.message ?? "Credenciais inválidas." },
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

  response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });

  return response;
}
