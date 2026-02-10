import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_API_URL não configurada." },
      { status: 500 }
    );
  }

  const headers = new Headers();
  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  let apiResponse: Response;

  try {
    apiResponse = await fetch(new URL("/api/auth/me", apiBaseUrl), {
      headers,
      credentials: "include"
    });
  } catch (error) {
    console.error("Erro ao conectar na API de autenticação:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de autenticação." },
      { status: 502 }
    );
  }

  if (apiResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao consultar sessão." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
