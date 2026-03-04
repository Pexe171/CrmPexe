import { apiFetch } from "./client";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  currentWorkspaceId: string | null;
  isSuperAdmin?: boolean;
};

export const authApi = {
  requestOtp: (email: string) =>
    apiFetch<{ message: string }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ email })
    }),

  requestSignupOtp: (data: { email: string; name: string; contact: string; emailConfirmation: string }) =>
    apiFetch<{ message: string }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  verifyOtp: async (email: string, code: string) => {
    const res = await apiFetch<{ user: AuthUser; accessToken: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code })
    });
    if (res.accessToken) {
      localStorage.setItem("crm_token", res.accessToken);
    }
    return res.user;
  },

  me: () => apiFetch<AuthUser>("/auth/me"),

  logout: async () => {
    try {
      await apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("crm_token");
    }
  }
};
