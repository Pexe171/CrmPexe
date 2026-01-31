"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useBranding } from "@/components/branding/branding-provider";
import { useGlobalFeedback } from "@/components/global-feedback";
import { getDefaultDashboardPath, normalizeUserRole } from "@/lib/rbac";
import { useAuthOtp } from "@/lib/use-auth-otp";
import { useLoginFlow } from "@/lib/use-login-flow";
import { useTranslations } from "@/lib/use-translations";

const initialState = {
  name: "",
  contact: "",
  email: "",
  emailConfirmation: "",
  code: ""
};

export function RegisterForm() {
  const router = useRouter();
  const { brandName, brandLogoUrl } = useBranding();
  const { t } = useTranslations();
  const { clearFeedback } = useGlobalFeedback();
  const { formState, onChange, status, setStatus, step, setStep, resetToRequest } =
    useLoginFlow(initialState);
  const { isLoading, requestOtp, verifyOtp } = useAuthOtp();
  const [isPending, startTransition] = useTransition();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setStatus(null);

    if (step === "request") {
      const result = await requestOtp({
        name: formState.name,
        contact: formState.contact,
        email: formState.email,
        emailConfirmation: formState.emailConfirmation
      });

      if (!result.ok) {
        return;
      }

      setStep("verify");
      setStatus("Código enviado! Confira seu e-mail.");
      return;
    }

    const result = await verifyOtp({
      email: formState.email,
      code: formState.code
    });

    if (!result.ok) {
      return;
    }

    const targetPath = getDefaultDashboardPath(
      normalizeUserRole(result.data?.user?.role)
    );

    startTransition(() => {
      router.replace(targetPath);
      router.refresh();
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <header className="space-y-3">
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt={brandName || t("auth.register.brand")}
              className="h-10 w-auto"
            />
          ) : null}
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand-secondary)]">
            {brandName || t("auth.register.brand")}
          </p>
          <h1 className="text-3xl font-semibold">{t("auth.register.title")}</h1>
          <p className="text-sm text-slate-300">
            {t("auth.register.subtitle")}
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="name">
              {t("auth.register.name")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formState.name}
              onChange={onChange}
              readOnly={step === "verify"}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder={t("auth.register.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="contact">
              {t("auth.register.contact")}
            </label>
            <input
              id="contact"
              name="contact"
              type="text"
              required
              value={formState.contact}
              onChange={onChange}
              readOnly={step === "verify"}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder={t("auth.register.contactPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="email">
              {t("auth.register.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formState.email}
              onChange={onChange}
              readOnly={step === "verify"}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder={t("auth.register.emailPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm text-slate-200"
              htmlFor="emailConfirmation"
            >
              {t("auth.register.emailConfirmation")}
            </label>
            <input
              id="emailConfirmation"
              name="emailConfirmation"
              type="email"
              autoComplete="email"
              required
              value={formState.emailConfirmation}
              onChange={onChange}
              readOnly={step === "verify"}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder={t("auth.register.emailPlaceholder")}
            />
          </div>

          {step === "verify" ? (
            <div className="space-y-2">
              <label className="text-sm text-slate-200" htmlFor="code">
                {t("auth.login.code")}
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={formState.code}
                onChange={onChange}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder={t("auth.login.codePlaceholder")}
              />
            </div>
          ) : null}

          {status ? (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {status}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending || isLoading}>
            {isPending || isLoading
              ? step === "request"
                ? t("auth.login.requestLoading")
                : t("auth.login.verifyLoading")
              : step === "request"
                ? t("auth.login.request")
                : t("auth.register.submit")}
          </Button>

          {step === "verify" ? (
            <button
              type="button"
              className="w-full text-sm text-slate-400 hover:text-emerald-300"
              onClick={resetToRequest}
            >
              {t("auth.register.change")}
            </button>
          ) : null}
        </form>

        <footer className="text-xs text-slate-400">
          Já tem conta?{" "}
          <Link
            className="text-emerald-300 hover:text-emerald-200"
            href="/login"
          >
            Entrar com OTP
          </Link>
          .
        </footer>
      </div>
    </main>
  );
}
