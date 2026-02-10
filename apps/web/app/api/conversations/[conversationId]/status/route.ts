import { NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/api-proxy";

type RouteContext = {
  params: {
    conversationId: string;
  };
};

export async function PATCH(request: Request, context: RouteContext) {
  const headers = new Headers({
    "Content-Type": "application/json"
  });

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const body = await request.text();

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL(
        `/api/conversations/${context.params.conversationId}/status`,
        apiBaseUrl
      ),
      {
        method: "PATCH",
        headers,
        credentials: "include",
        body
      }
    );
  } catch (error) {
    console.error("Erro ao atualizar status da conversa:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar ao serviço." },
      { status: 502 }
    );
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao atualizar status da conversa." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
