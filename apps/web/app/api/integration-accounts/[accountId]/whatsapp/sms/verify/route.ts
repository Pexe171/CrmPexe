import { NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/api-proxy";

const buildHeaders = (request: Request) => {
  const headers = new Headers();
  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  return headers;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body?.phone || !body?.code) {
    return NextResponse.json(
      { message: "Telefone e código são obrigatórios para validar SMS." },
      { status: 400 }
    );
  }

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL(
        `/api/integration-accounts/${accountId}/whatsapp/sms/verify`,
        apiBaseUrl
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(buildHeaders(request).entries())
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
      { message: payload?.message ?? "Falha ao validar código SMS." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
