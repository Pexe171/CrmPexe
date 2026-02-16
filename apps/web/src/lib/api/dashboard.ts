import { API_BASE_URL } from "./config";
import type { DashboardData } from "./types";

async function apiFetch<T>(endpoint: string): Promise<T> {
  const token = localStorage.getItem("crm_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const dashboardApi = {
  getSales: () => apiFetch<DashboardData>("/api/dashboard/sales"),
};
