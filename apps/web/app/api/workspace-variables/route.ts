import { NextResponse } from "next/server";
import { apiBaseUrl, buildApiHeaders } from "@/lib/api-proxy";

const handleApiError = async (
  apiResponse: Response,
  fallbackMessage: string
) => {
  const payload = await apiResponse.json().catch(() => null);

  return NextResponse.json(
    { message: payload?.message ?? fallbackMessage },
    { status: apiResponse.status }
  );
};

export async function GET(request: Request) {
  let apiResponse: Response;

  try {
    apiResponse = await fetch(new URL("/api/workspace-variables", apiBaseUrl), {
      headers: buildApiHeaders(request),
      credentials: "include"
    });
  } catch (error) {
    console.error("Erro ao conectar na API de variáveis do workspace:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de variáveis do workspace." },
      { status: 502 }
    );
  }

  if (!apiResponse.ok) {
    return handleApiError(
      apiResponse,
      "Falha ao carregar variáveis do workspace."
    );
  }

  const payload = await apiResponse.json().catch(() => null);
  return NextResponse.json(payload ?? []);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { message: "Dados inválidos para salvar a variável." },
      { status: 400 }
    );
  }

  let apiResponse: Response;

  try {
    apiResponse = await fetch(new URL("/api/workspace-variables", apiBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(buildApiHeaders(request).entries())
      },
      credentials: "include",
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Erro ao conectar na API de variáveis do workspace:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de variáveis do workspace." },
      { status: 502 }
    );
  }

  if (!apiResponse.ok) {
    return handleApiError(
      apiResponse,
      "Falha ao salvar variável do workspace."
    );
  }

  const payload = await apiResponse.json().catch(() => null);
  return NextResponse.json(payload ?? null);
}
