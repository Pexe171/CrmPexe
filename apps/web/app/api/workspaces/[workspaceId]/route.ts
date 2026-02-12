import { NextResponse } from "next/server";
import { apiBaseUrl, buildApiHeaders } from "@/lib/api-proxy";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await context.params;
  const body = await request.json().catch(() => null);

  let apiResponse: Response;

  try {
    const headers = buildApiHeaders(request);
    headers.set("Content-Type", "application/json");

    apiResponse = await fetch(
      new URL(`/api/workspaces/${workspaceId}`, apiBaseUrl),
      {
        method: "DELETE",
        headers,
        credentials: "include",
        body: JSON.stringify({ reason: body?.reason ?? undefined })
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
      { message: payload?.message ?? "Falha ao excluir workspace." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
}
