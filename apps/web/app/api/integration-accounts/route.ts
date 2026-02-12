import { NextResponse } from "next/server";
import { apiBaseUrl, buildApiHeaders } from "@/lib/api-proxy";

export async function GET(request: Request) {
  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL("/api/integration-accounts", apiBaseUrl),
      {
        headers: buildApiHeaders(request),
        credentials: "include"
      }
    );
  } catch (error) {
    console.error("Erro ao conectar na API de integrações:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de integrações." },
      { status: 502 }
    );
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao carregar integrações." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? []);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { message: "Dados inválidos para criar integração." },
      { status: 400 }
    );
  }

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL("/api/integration-accounts", apiBaseUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(buildApiHeaders(request).entries())
        },
        credentials: "include",
        body: JSON.stringify(body)
      }
    );
  } catch (error) {
    console.error("Erro ao conectar na API de integrações:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de integrações." },
      { status: 502 }
    );
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao criar integração." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
