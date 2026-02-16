import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardData } from "@/lib/api/types";

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard", "sales"],
    queryFn: dashboardApi.getSales,
    refetchInterval: 30000, // refresh a cada 30s
    retry: 1,
  });
}
