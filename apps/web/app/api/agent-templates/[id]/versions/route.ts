import { proxyApiGet } from "@/lib/api-proxy";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  return proxyApiGet(request, `/api/agent-templates/${context.params.id}/versions`);
}
