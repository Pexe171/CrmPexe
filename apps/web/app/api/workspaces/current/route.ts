import { NextResponse } from "next/server";
import { apiBaseUrl, buildApiHeaders } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const headers = buildApiHeaders(request);

  let apiResponse: Response;

  try {
    apiResponse = await fetch(new URL("/api/workspaces/current", apiBaseUrl), {
      headers,
      credentials: "include"
    });
  } catch (error) {
    console.error("Erro ao conectar na API de workspaces:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de workspaces." },
      { status: 502 }
    );
  }

  if (apiResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao carregar workspace atual." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
