"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const initialState = {
  name: "",
  contact: "",
  email: "",
  emailConfirmation: "",
  code: ""
};

export function RegisterForm() {
  const router = useRouter();
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [isPending, startTransition] = useTransition();

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (step === "request") {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formState.name,
          contact: formState.contact,
          email: formState.email,
          emailConfirmation: formState.emailConfirmation
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.message ?? "Falha ao solicitar código.");
        return;
      }

      setStep("verify");
      setStatus("Código enviado! Confira seu e-mail.");
      return;
    }

    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: formState.email, code: formState.code })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.message ?? "Falha ao validar o código.");
      return;
    }

    startTransition(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
            CrmPexe
          </p>
          <h1 className="text-3xl font-semibold">Criar acesso</h1>
          <p className="text-sm text-slate-300">
            Cadastre seus dados e confirme o OTP enviado por e-mail.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="name">
              Nome
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
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="contact">
              Contato
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
              placeholder="Telefone ou WhatsApp"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="email">
              E-mail
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
              placeholder="voce@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="emailConfirmation">
              Confirme o e-mail
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
              placeholder="voce@empresa.com"
            />
          </div>

          {step === "verify" ? (
            <div className="space-y-2">
              <label className="text-sm text-slate-200" htmlFor="code">
                Código recebido
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
                placeholder="123456"
              />
            </div>
          ) : null}

          {status ? (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {status}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? step === "request"
                ? "Enviando código..."
                : "Validando código..."
              : step === "request"
                ? "Enviar código"
                : "Finalizar cadastro"}
          </Button>

          {step === "verify" ? (
            <button
              type="button"
              className="w-full text-sm text-slate-400 hover:text-emerald-300"
              onClick={() => {
                setStep("request");
                setFormState((prev) => ({ ...prev, code: "" }));
              }}
            >
              Alterar dados ou reenviar código
            </button>
          ) : null}
        </form>

        <footer className="text-xs text-slate-400">
          Já tem conta?{" "}
          <Link className="text-emerald-300 hover:text-emerald-200" href="/login">
            Entrar com OTP
          </Link>
          .
        </footer>
      </div>
    </main>
  );
}
