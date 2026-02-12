import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSetCookieHeaders } from "@/lib/set-cookie";

export const apiBaseUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const getAccessTokenFromCookie = (cookieHeader: string) => {
  const tokenMatch = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ACCESS_TOKEN_COOKIE}=([^;]+)`)
  );

  if (!tokenMatch?.[1]) {
    return null;
  }

  return decodeURIComponent(tokenMatch[1]);
};

const hasCookie = (cookieHeader: string | null, cookieName: string) => {
  if (!cookieHeader) {
    return false;
  }

  return new RegExp(`(?:^|;\\s*)${cookieName}=`).test(cookieHeader);
};

const getCookieValue = (cookieHeader: string | null, cookieName: string) => {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`)
  );
  if (!match?.[1]) {
    return null;
  }

  return decodeURIComponent(match[1]);
};

const isLikelyJwt = (token: string | null) => {
  if (!token) {
    return false;
  }

  return token.split(".").length === 3;
};

const buildExpiredAuthCookie = (cookieName: string) =>
  `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

const extractCookieFromSetCookie = (
  setCookies: string[],
  cookieName: string
) => {
  for (const setCookie of setCookies) {
    const match = setCookie.match(new RegExp(`^${cookieName}=([^;]*)`));
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
};

const buildResponse = async (
  apiResponse: Response,
  fallbackMessage: string
) => {
  if (apiResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? fallbackMessage },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
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
    if (accessToken) {
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
  const cookieHeader = headers.get("cookie");
  const cookieStore = cookies();
  const refreshTokenFromHeader = getCookieValue(
    cookieHeader,
    REFRESH_TOKEN_COOKIE
  );
  const refreshTokenFromStore =
    cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = refreshTokenFromHeader ?? refreshTokenFromStore;
  const hasRefreshToken =
    hasCookie(cookieHeader, REFRESH_TOKEN_COOKIE) ||
    Boolean(refreshTokenFromStore);
  const canAttemptRefresh = hasRefreshToken && isLikelyJwt(refreshToken);

  const requestUrl = new URL(request.url);
  const target = new URL(path, apiBaseUrl);
  target.search = requestUrl.search;

  let apiResponse: Response;

  try {
    apiResponse = await fetch(target, {
      headers,
      credentials: "include"
    });

    if (apiResponse.status === 401 && hasRefreshToken && !canAttemptRefresh) {
      const response = await buildResponse(
        apiResponse,
        "Falha ao consultar recurso."
      );

      response.headers.append(
        "set-cookie",
        buildExpiredAuthCookie(ACCESS_TOKEN_COOKIE)
      );
      response.headers.append(
        "set-cookie",
        buildExpiredAuthCookie(REFRESH_TOKEN_COOKIE)
      );

      return response;
    }

    if (apiResponse.status === 401 && canAttemptRefresh) {
      const refreshResponse = await fetch(
        new URL("/api/auth/refresh", apiBaseUrl),
        {
          method: "POST",
          headers,
          credentials: "include"
        }
      );

      if (refreshResponse.ok) {
        const refreshSetCookies = getSetCookieHeaders(refreshResponse);
        const renewedAccessToken = extractCookieFromSetCookie(
          refreshSetCookies,
          ACCESS_TOKEN_COOKIE
        );

        if (renewedAccessToken) {
          headers.set("authorization", `Bearer ${renewedAccessToken}`);
        }

        apiResponse = await fetch(target, {
          headers,
          credentials: "include"
        });

        const response = await buildResponse(
          apiResponse,
          "Falha ao consultar recurso."
        );

        refreshSetCookies.forEach((setCookie) => {
          response.headers.append("set-cookie", setCookie);
        });

        return response;
      }

      if (refreshResponse.status === 401 || refreshResponse.status === 403) {
        const response = await buildResponse(
          apiResponse,
          "Falha ao consultar recurso."
        );

        response.headers.append(
          "set-cookie",
          buildExpiredAuthCookie(ACCESS_TOKEN_COOKIE)
        );
        response.headers.append(
          "set-cookie",
          buildExpiredAuthCookie(REFRESH_TOKEN_COOKIE)
        );

        return response;
      }
    }
  } catch (error) {
    console.error(`Erro ao conectar na API (${path}):`, error);
    return NextResponse.json(
      { message: "Não foi possível conectar ao serviço." },
      { status: 502 }
    );
  }

  return buildResponse(apiResponse, "Falha ao consultar recurso.");
}
