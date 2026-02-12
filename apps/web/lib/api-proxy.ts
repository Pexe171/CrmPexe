import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ACCESS_TOKEN_COOKIE = "access_token";

const getAccessTokenFromCookie = (cookieHeader: string) => {
  const tokenMatch = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ACCESS_TOKEN_COOKIE}=([^;]+)`)
  );

  if (!tokenMatch?.[1]) {
    return null;
  }

  return decodeURIComponent(tokenMatch[1]);
};

export const buildApiHeaders = (request: Request) => {
  const headers = new Headers();
  const cookieHeader = request.headers.get("cookie");
  const authorizationHeader = request.headers.get("authorization");
  const cookieStore = cookies();
  const fallbackAccessToken =
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const fallbackCookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");

  if (authorizationHeader) {
    headers.set("authorization", authorizationHeader);
  }

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);

    const accessToken = getAccessTokenFromCookie(cookieHeader);
    if (accessToken && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }
  }

  if (!cookieHeader && fallbackCookieHeader) {
    headers.set("cookie", fallbackCookieHeader);
  }

  if (!headers.has("authorization") && fallbackAccessToken) {
    headers.set("authorization", `Bearer ${fallbackAccessToken}`);
  }

  return headers;
};

export async function proxyApiGet(request: Request, path: string) {
  const headers = buildApiHeaders(request);

  const requestUrl = new URL(request.url);
  const target = new URL(path, apiBaseUrl);
  target.search = requestUrl.search;

  let apiResponse: Response;

  try {
    apiResponse = await fetch(target, {
      headers,
      credentials: "include"
    });
  } catch (error) {
    console.error(`Erro ao conectar na API (${path}):`, error);
    return NextResponse.json(
      { message: "Não foi possível conectar ao serviço." },
      { status: 502 }
    );
  }

  if (apiResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao consultar recurso." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
