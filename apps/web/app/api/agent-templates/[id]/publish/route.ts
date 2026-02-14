import { proxyApiPost } from "@/lib/api-proxy";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  return proxyApiPost(request, `/api/agent-templates/${context.params.id}/publish`);
}
