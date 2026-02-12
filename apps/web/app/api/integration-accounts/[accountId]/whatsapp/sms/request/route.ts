import { NextResponse } from "next/server";
import { apiBaseUrl, buildApiHeaders } from "@/lib/api-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body?.phone) {
    return NextResponse.json(
      { message: "Telefone é obrigatório para solicitar SMS." },
      { status: 400 }
    );
  }

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL(
        `/api/integration-accounts/${accountId}/whatsapp/sms/request`,
        apiBaseUrl
      ),
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
    console.error("Erro ao conectar na API de WhatsApp:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de integrações." },
      { status: 502 }
    );
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao solicitar código SMS." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
