import { proxyApiGet } from "@/lib/api-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  return proxyApiGet(
    request,
    `/api/integration-accounts/${accountId}/whatsapp/status`
  );
}
