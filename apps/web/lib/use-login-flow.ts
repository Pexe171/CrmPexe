"use client";

import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";

type OtpStep = "request" | "verify";

type UseLoginFlowOptions<T> = {
  codeField?: keyof T;
};

export function useLoginFlow<T extends Record<string, string>>(
  initialState: T,
  options: UseLoginFlowOptions<T> = {}
) {
  const { codeField = "code" as keyof T } = options;
  const [formState, setFormState] = useState<T>(initialState);
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState<OtpStep>("request");

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const resetToRequest = useCallback(() => {
    setStep("request");
    setFormState((prev) => ({
      ...prev,
      [codeField]: ""
    }));
  }, [codeField]);

  return {
    formState,
    setFormState,
    onChange,
    status,
    setStatus,
    step,
    setStep,
    resetToRequest
  };
}
