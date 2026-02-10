import { NextResponse } from "next/server";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function proxyApiGet(request: Request, path: string) {
  const headers = new Headers();
  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

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
