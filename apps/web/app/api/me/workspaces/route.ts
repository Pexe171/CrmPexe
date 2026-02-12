import { NextRequest } from "next/server";
import { proxyApiGet } from "@/lib/api-proxy";

export async function GET(request: NextRequest) {
  return proxyApiGet(request, "/api/me/workspaces");
}
