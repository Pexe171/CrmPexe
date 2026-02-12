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
  context: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await context.params;
  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL(`/api/workspaces/${workspaceId}/switch`, apiBaseUrl),
      {
        method: "POST",
        headers: buildHeaders(request),
        credentials: "include"
      }
    );
  } catch (error) {
    console.error("Erro ao conectar na API de workspaces:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de workspaces." },
      { status: 502 }
    );
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao trocar workspace." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
