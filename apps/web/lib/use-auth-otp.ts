"use client";

import { useCallback, useState } from "react";

import { useGlobalFeedback } from "@/components/global-feedback";

type RequestOtpPayload = {
  email: string;
  name?: string;
  contact?: string;
  emailConfirmation?: string;
  captchaToken?: string;
};

type VerifyOtpPayload = {
  email: string;
  code: string;
  captchaToken?: string;
};

type AuthVerifyResponse = {
  user?: {
    role?: string | null;
  };
};

type AuthResult<T> = {
  ok: boolean;
  data?: T;
};

export function useAuthOtp() {
  const { showError } = useGlobalFeedback();
  const [isLoading, setIsLoading] = useState(false);

  const requestOtp = useCallback(
    async (
      payload: RequestOtpPayload
    ): Promise<AuthResult<{ expiresAt?: string }>> => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/request-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          showError(data?.message ?? "Falha ao solicitar código.");
          return { ok: false };
        }

        const data = (await response.json().catch(() => ({}))) as {
          expiresAt?: string;
        };

        return { ok: true, data };
      } catch (error) {
        console.error("Erro ao solicitar OTP:", error);
        showError("Falha inesperada ao solicitar o código.");
        return { ok: false };
      } finally {
        setIsLoading(false);
      }
    },
    [showError]
  );

  const verifyOtp = useCallback(
    async (
      payload: VerifyOtpPayload
    ): Promise<AuthResult<AuthVerifyResponse>> => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          showError(data?.message ?? "Falha ao autenticar.");
          return { ok: false };
        }

        const data = (await response
          .json()
          .catch(() => ({}))) as AuthVerifyResponse;
        return { ok: true, data };
      } catch (error) {
        console.error("Erro ao validar OTP:", error);
        showError("Falha inesperada ao validar o código.");
        return { ok: false };
      } finally {
        setIsLoading(false);
      }
    },
    [showError]
  );

  return {
    isLoading,
    requestOtp,
    verifyOtp
  };
}
