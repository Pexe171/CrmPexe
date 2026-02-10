import { proxyApiGet } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyApiGet(request, "/api/audit-logs");
}
