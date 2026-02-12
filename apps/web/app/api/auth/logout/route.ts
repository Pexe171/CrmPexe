import { NextResponse } from "next/server";

import { getSetCookieHeaders } from "@/lib/set-cookie";

import { SESSION_COOKIE } from "@/lib/auth";
import { ROLE_COOKIE, SUPER_ADMIN_COOKIE } from "@/lib/rbac";

export async function POST() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_API_URL não configurada." },
      { status: 500 }
    );
  }

  const apiResponse = await fetch(new URL("/api/auth/logout", apiBaseUrl), {
    method: "POST",
    credentials: "include"
  });

  const response = NextResponse.json({ ok: apiResponse.ok });
  const setCookies = getSetCookieHeaders(apiResponse);

  setCookies.filter(Boolean).forEach((cookie) => {
    response.headers.append("set-cookie", cookie);
  });

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  response.cookies.set(ROLE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  response.cookies.set(SUPER_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
