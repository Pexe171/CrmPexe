import { NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import {
  ROLE_COOKIE,
  ROLE_COOKIE_MAX_AGE,
  SUPER_ADMIN_COOKIE,
  SUPER_ADMIN_COOKIE_MAX_AGE,
  normalizeUserRole
} from "@/lib/rbac";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const IMPERSONATION_MAX_AGE = 60 * 15;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.workspaceId || !body?.userId) {
    return NextResponse.json(
      { message: "Workspace e usuário são obrigatórios." },
      { status: 400 }
    );
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL("/api/support/impersonations", apiBaseUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") ?? ""
        },
        body: JSON.stringify({
          workspaceId: body.workspaceId,
          userId: body.userId,
          reason: body.reason ?? null
        }),
        credentials: "include"
      }
    );
  } catch (error) {
    console.error("Erro ao conectar na API de suporte:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de suporte." },
      { status: 502 }
    );
  }

  const apiPayload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: apiPayload?.message ?? "Erro ao gerar token de suporte." },
      { status: apiResponse.status }
    );
  }

  const response = NextResponse.json({ ok: true, session: apiPayload ?? null });
  const targetRole = normalizeUserRole(apiPayload?.targetUser?.role) ?? "USER";

  response.cookies.set(ACCESS_TOKEN_COOKIE, apiPayload.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: IMPERSONATION_MAX_AGE
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });

  response.cookies.set(ROLE_COOKIE, targetRole, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ROLE_COOKIE_MAX_AGE
  });

  response.cookies.set(SUPER_ADMIN_COOKIE, "false", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SUPER_ADMIN_COOKIE_MAX_AGE
  });

  return response;
}
