import { NextResponse } from "next/server";
import { apiBaseUrl, buildApiHeaders } from "@/lib/api-proxy";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.code || !body?.password) {
    return NextResponse.json(
      { message: "Código e senha do workspace são obrigatórios." },
      { status: 400 }
    );
  }

  let apiResponse: Response;

  try {
    apiResponse = await fetch(new URL("/api/workspaces/join", apiBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(buildApiHeaders(request).entries())
      },
      credentials: "include",
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Erro ao conectar na API de entrada em workspace:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de entrada em workspace." },
      { status: 502 }
    );
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      {
        message: payload?.message ?? "Falha ao solicitar entrada no workspace."
      },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
