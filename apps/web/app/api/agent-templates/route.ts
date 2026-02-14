import { proxyApiGet, proxyApiPost } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyApiGet(request, "/api/agent-templates");
}

export async function POST(request: Request) {
  return proxyApiPost(request, "/api/agent-templates/import");
}
