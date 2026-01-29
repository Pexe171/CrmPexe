import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.email) {
    return NextResponse.json(
      { message: "E-mail é obrigatório." },
      { status: 400 }
    );
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "URL da API não configurada." },
      { status: 500 }
    );
  }

  let apiResponse: Response;
  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  try {
    apiResponse = await fetch(new URL("/api/auth/request-otp", apiBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        ...(userAgent ? { "user-agent": userAgent } : {})
      },
      body: JSON.stringify(body),
      credentials: "include"
    });
  } catch (error) {
    console.error("Erro ao conectar na API de autenticação:", error);
    return NextResponse.json(
      {
        message:
          "Não foi possível conectar à API. Verifique se o backend está rodando e se NEXT_PUBLIC_API_URL está correto."
      },
      { status: 502 }
    );
  }

  const apiPayload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: apiPayload?.message ?? "Falha ao solicitar o código." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(apiPayload ?? { ok: true });
}
