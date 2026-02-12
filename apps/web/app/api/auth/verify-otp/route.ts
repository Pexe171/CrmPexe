import { NextResponse } from "next/server";

import { getSetCookieHeaders } from "@/lib/set-cookie";

import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import {
  ROLE_COOKIE,
  ROLE_COOKIE_MAX_AGE,
  SUPER_ADMIN_COOKIE,
  SUPER_ADMIN_COOKIE_MAX_AGE,
  normalizeSuperAdminFlag,
  normalizeUserRole
} from "@/lib/rbac";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const extractCookieValue = (setCookieHeaders: string[], cookieName: string) => {
  for (const setCookieHeader of setCookieHeaders) {
    const cookieRegex = new RegExp(`(?:^|\\s)${cookieName}=([^;]+)`);
    const match = setCookieHeader.match(cookieRegex);

    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.email || !body?.code) {
    return NextResponse.json(
      { message: "E-mail e código são obrigatórios." },
      { status: 400 }
    );
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_API_URL não configurada." },
      { status: 500 }
    );
  }

  let apiResponse: Response;
  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  try {
    apiResponse = await fetch(new URL("/api/auth/verify-otp", apiBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        ...(userAgent ? { "user-agent": userAgent } : {})
      },
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
  const setCookies = getSetCookieHeaders(apiResponse);
  const requestHost = new URL(request.url).hostname;
  const cookieDomain = requestHost === "localhost" ? undefined : requestHost;

  setCookies.filter(Boolean).forEach((cookie) => {
    response.headers.append("set-cookie", cookie);
  });

  const accessToken = extractCookieValue(setCookies, ACCESS_TOKEN_COOKIE);
  const refreshToken = extractCookieValue(setCookies, REFRESH_TOKEN_COOKIE);

  console.info("[verify-otp] accessToken disponível:", Boolean(accessToken));
  console.info("[verify-otp] refreshToken disponível:", Boolean(refreshToken));
  console.info(
    "[verify-otp] domínio aplicado aos cookies:",
    cookieDomain ?? "host-only (localhost)"
  );

  if (accessToken) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
      ...(cookieDomain ? { domain: cookieDomain } : {})
    });
  }

  if (refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      ...(cookieDomain ? { domain: cookieDomain } : {})
    });
  }

  const role = normalizeUserRole(apiPayload?.role) ?? "USER";
  const isSuperAdmin = normalizeSuperAdminFlag(
    String(apiPayload?.isSuperAdmin ?? "false")
  );

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

  response.cookies.set(SUPER_ADMIN_COOKIE, String(isSuperAdmin), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SUPER_ADMIN_COOKIE_MAX_AGE
  });

  return response;
}
