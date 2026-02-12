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

const callApi = async (
  request: Request,
  accountId: string,
  method: "PATCH" | "DELETE" | "PUT",
  path = ""
) => {
  const body =
    method === "DELETE" ? null : await request.json().catch(() => null);

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      new URL(`/api/integration-accounts/${accountId}${path}`, apiBaseUrl),
      {
        method,
        headers: {
          ...(method === "DELETE"
            ? {}
            : { "Content-Type": "application/json" }),
          ...Object.fromEntries(buildHeaders(request).entries())
        },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined
      }
    );
  } catch (error) {
    console.error("Erro ao conectar na API de integrações:", error);
    return NextResponse.json(
      { message: "Não foi possível conectar à API de integrações." },
      { status: 502 }
    );
  }

  const payload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: payload?.message ?? "Falha ao atualizar integração." },
      { status: apiResponse.status }
    );
  }

  return NextResponse.json(payload ?? null);
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  return callApi(request, accountId, "PATCH");
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  return callApi(request, accountId, "DELETE");
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  return callApi(request, accountId, "PUT", "/secret");
}
