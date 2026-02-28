import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function safeParseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const bodyText = await response.text();
    throw new ApiError(
      "Resposta inválida da API (esperado JSON). Verifique se o backend está acessível em /api.",
      response.status,
      bodyText.slice(0, 180)
    );
  }

  return (await response.json()) as T;
}

function extractErrorMessage(body: string, status: number, statusText: string): string {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed.message === "string") return parsed.message;
    if (Array.isArray(parsed.message)) return parsed.message.join(", ");
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // not JSON
  }
  if (body && body.length < 200) return body;
  return `Erro ${status}: ${statusText}`;
}

export async function apiFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("crm_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined)
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const bodyText = await response.text();
    const message = extractErrorMessage(bodyText, response.status, response.statusText);
    throw new ApiError(message, response.status, bodyText.slice(0, 180));
  }

  return safeParseJson<T>(response);
}
