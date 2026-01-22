import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "URL da API não configurada." },
      { status: 500 }
    );
  }

  const apiResponse = await fetch(new URL("/api/auth/logout", apiBaseUrl), {
    method: "POST",
    credentials: "include"
  });

  const response = NextResponse.json({ ok: apiResponse.ok });
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

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
