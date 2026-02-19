import { apiFetch } from "./client";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  currentWorkspaceId: string | null;
};

export const authApi = {
  requestOtp: (email: string) =>
    apiFetch<{ message: string }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ email })
    }),
  verifyOtp: (email: string, code: string) =>
    apiFetch<AuthUser>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code })
    }),
  me: () => apiFetch<AuthUser>("/auth/me"),
  logout: () =>
    apiFetch<{ message: string }>("/auth/logout", {
      method: "POST"
    })
};
