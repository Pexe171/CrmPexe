"use client";

import { useEffect, useState } from "react";

type SupportSession = {
  isImpersonated: boolean;
  impersonatedByUserId?: string | null;
  impersonatedWorkspaceId?: string | null;
};

export function SupportModeBanner() {
  const [session, setSession] = useState<SupportSession | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          signal: controller.signal
        });

        if (response.status === 204) {
          setSession(null);
          return;
        }

        if (!response.ok) {
          setSession(null);
          return;
        }

        const data = (await response.json()) as SupportSession;
        setSession(data);
      } catch {
        setSession(null);
      }
    };

    void loadSession();

    return () => controller.abort();
  }, []);

  if (!session?.isImpersonated) {
    return null;
  }

  return (
    <div className="w-full border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Modo suporte ativo</span>
        <span>
          Você está usando um acesso temporário para suporte. As ações ficam registradas
          no audit log.
        </span>
      </div>
    </div>
  );
}
