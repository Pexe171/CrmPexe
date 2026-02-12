import { NextRequest, NextResponse } from "next/server";
import { apiBaseUrl, buildApiHeaders, proxyApiGet } from "@/lib/api-proxy";

export async function GET(request: NextRequest) {
  return proxyApiGet(request, "/api/workspaces");
}

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => null);

  if (!body?.name || !body?.password) {
    return NextResponse.json(
      { message: "Nome e senha do workspace são obrigatórios." },
      { status: 400 }
    );
  }

  let apiResponse: Response;

  try {
    const headers = buildApiHeaders(request);
    headers.set("Content-Type", "application/json");

    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    apiResponse = await fetch(new URL("/api/workspaces", apiBaseUrl), {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Erro ao conectar na API de workspaces:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de workspaces." },
      { status: 502 }
    );
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao criar workspace." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
