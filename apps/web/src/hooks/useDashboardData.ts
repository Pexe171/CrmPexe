import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardData } from "@/lib/api/types";
import type { AutomationDashboardResponse } from "@/lib/api/dashboard";

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard", "sales"],
    queryFn: dashboardApi.getSales,
    refetchInterval: 30000,
    retry: 1,
  });
}

export function useAutomationDashboardData() {
  return useQuery<AutomationDashboardResponse>({
    queryKey: ["dashboard", "automation"],
    queryFn: dashboardApi.getAutomation,
    refetchInterval: 60000,
    retry: 1,
  });
}
