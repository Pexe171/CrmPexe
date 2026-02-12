import { NextResponse } from "next/server";
import { apiBaseUrl, buildApiHeaders } from "@/lib/api-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL(
        `/api/integration-accounts/${accountId}/whatsapp/evolution/connect`,
        apiBaseUrl
      ),
      {
        method: "POST",
        headers: buildApiHeaders(request),
        credentials: "include"
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
      {
        message:
          payload?.message ?? "Falha ao iniciar conexão Evolution no WhatsApp."
      },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
