import { apiFetch } from "./client";
import type { DashboardData } from "./types";

export const dashboardApi = {
  getSales: () => apiFetch<DashboardData>("/dashboard/sales")
};
