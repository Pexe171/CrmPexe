import { proxyApiPost } from "@/lib/api-proxy";

export async function POST(
  request: Request,
  context: { params: { agentTemplateId: string } }
) {
  return proxyApiPost(
    request,
    `/api/workspace-agents/${context.params.agentTemplateId}/deactivate`
  );
}
