"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

type WorkspaceVariable = {
  key: string;
  value: string | null;
  isSensitive: boolean;
};

type OpenAiFormState = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

type SmtpFormState = {
  host: string;
  port: string;
  user: string;
  pass: string;
  from: string;
  secure: string;
};

type SocialIntegrationType =
  | "INSTAGRAM_DIRECT"
  | "FACEBOOK_MESSENGER"
  | "WHATSAPP";

type IntegrationAccount = {
  id: string;
  type: SocialIntegrationType | "OPENAI" | "N8N" | "EMAIL" | "VOIP";
  name: string;
  status: "ACTIVE" | "INACTIVE";
};

const defaultOpenAiForm: OpenAiFormState = {
  apiKey: "",
  model: "gpt-4o-mini",
  baseUrl: "https://api.openai.com/v1"
};

const defaultSmtpForm: SmtpFormState = {
  host: "",
  port: "465",
  user: "",
  pass: "",
  from: "",
  secure: "true"
};

export default function WorkspaceIntegrationsPage() {
  const [openAiForm, setOpenAiForm] =
    useState<OpenAiFormState>(defaultOpenAiForm);
  const [smtpForm, setSmtpForm] = useState<SmtpFormState>(defaultSmtpForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasOpenAiKey, setHasOpenAiKey] = useState(false);
  const [hasSmtpPass, setHasSmtpPass] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<
    Partial<Record<SocialIntegrationType, IntegrationAccount>>
  >({});

  const fetchVariables = useCallback(async () => {
    const response = await fetch("/api/workspace-variables", {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Não foi possível carregar as credenciais do workspace.");
    }

    const variables = (await response.json()) as WorkspaceVariable[];
    const map = variables.reduce<Record<string, WorkspaceVariable>>(
      (acc, variable) => {
        acc[variable.key] = variable;
        return acc;
      },
      {}
    );

    setOpenAiForm({
      apiKey: "",
      model: map.OPENAI_MODEL?.value ?? defaultOpenAiForm.model,
      baseUrl: map.OPENAI_BASE_URL?.value ?? defaultOpenAiForm.baseUrl
    });

    setSmtpForm({
      host: map.SMTP_HOST?.value ?? defaultSmtpForm.host,
      port: map.SMTP_PORT?.value ?? defaultSmtpForm.port,
      user: map.SMTP_USER?.value ?? defaultSmtpForm.user,
      pass: "",
      from: map.SMTP_FROM?.value ?? defaultSmtpForm.from,
      secure: map.SMTP_SECURE?.value ?? defaultSmtpForm.secure
    });

    setHasOpenAiKey(Boolean(map.OPENAI_API_KEY));
    setHasSmtpPass(Boolean(map.SMTP_PASS));
  }, []);

  const fetchSocialAccounts = useCallback(async () => {
    const response = await fetch("/api/integration-accounts", {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Não foi possível carregar as vinculações sociais.");
    }

    const accounts = (await response.json()) as IntegrationAccount[];
    const mapped = accounts.reduce<
      Partial<Record<SocialIntegrationType, IntegrationAccount>>
    >((acc, account) => {
      if (
        account.type === "INSTAGRAM_DIRECT" ||
        account.type === "FACEBOOK_MESSENGER" ||
        account.type === "WHATSAPP"
      ) {
        acc[account.type] = account;
      }
      return acc;
    }, {});

    setSocialAccounts(mapped);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchVariables(), fetchSocialAccounts()]);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro inesperado ao carregar integrações do workspace."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fetchSocialAccounts, fetchVariables]);

  const saveVariables = useCallback(
    async (
      payloads: Array<{ key: string; value: string; isSensitive: boolean }>
    ) => {
      for (const payload of payloads) {
        if (!payload.value.trim()) {
          continue;
        }

        const response = await fetch("/api/workspace-variables", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            ...payload,
            value: payload.value.trim()
          })
        });

        if (!response.ok) {
          throw new Error("Não foi possível salvar todas as credenciais.");
        }
      }
    },
    []
  );

  const handleSaveOpenAi = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await saveVariables([
        { key: "OPENAI_API_KEY", value: openAiForm.apiKey, isSensitive: true },
        { key: "OPENAI_MODEL", value: openAiForm.model, isSensitive: false },
        {
          key: "OPENAI_BASE_URL",
          value: openAiForm.baseUrl,
          isSensitive: false
        }
      ]);
      setOpenAiForm((prev) => ({ ...prev, apiKey: "" }));
      setHasOpenAiKey(true);
      setSuccess("Credenciais da OpenAI salvas com sucesso.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro inesperado ao salvar credenciais da OpenAI."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSmtp = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await saveVariables([
        { key: "SMTP_HOST", value: smtpForm.host, isSensitive: false },
        { key: "SMTP_PORT", value: smtpForm.port, isSensitive: false },
        { key: "SMTP_USER", value: smtpForm.user, isSensitive: false },
        { key: "SMTP_PASS", value: smtpForm.pass, isSensitive: true },
        { key: "SMTP_FROM", value: smtpForm.from, isSensitive: false },
        { key: "SMTP_SECURE", value: smtpForm.secure, isSensitive: false }
      ]);
      setSmtpForm((prev) => ({ ...prev, pass: "" }));
      if (smtpForm.pass.trim()) {
        setHasSmtpPass(true);
      }
      setSuccess("Credenciais SMTP salvas com sucesso.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro inesperado ao salvar credenciais SMTP."
      );
    } finally {
      setSaving(false);
    }
  };

  const statusItems = useMemo(
    () => [
      {
        title: "OpenAI API Key",
        value: hasOpenAiKey ? "Configurada" : "Pendente",
        tone: "ia"
      },
      {
        title: "SMTP Pass",
        value: hasSmtpPass ? "Configurada" : "Pendente",
        tone: "smtp"
      }
    ],
    [hasOpenAiKey, hasSmtpPass]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Configurações do workspace
          </p>
          <h1 className="text-3xl font-semibold">Integrações e credenciais</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Cadastre aqui a chave da OpenAI e/ou as credenciais SMTP para
            liberar os recursos de IA e envio de e-mail no workspace.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className={buttonVariants({
                variant: "outline",
                className: "border-white/20 text-white hover:border-white/40"
              })}
            >
              Voltar ao dashboard
            </Link>
            <Button
              variant="outline"
              onClick={() =>
                void Promise.all([fetchVariables(), fetchSocialAccounts()])
              }
              disabled={loading}
              className="border-white/20 text-white hover:border-white/40"
            >
              Recarregar status
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
        <section className="grid gap-4 md:grid-cols-2">
          {statusItems.map((item) => (
            <div
              key={item.title}
              className={`rounded-2xl border p-4 ${
                item.tone === "ia"
                  ? "border-violet-400/30 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-slate-900"
                  : "border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-slate-900"
              }`}
            >
              <p
                className={`text-xs ${
                  item.tone === "ia" ? "text-violet-200" : "text-amber-200"
                }`}
              >
                {item.title}
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-sky-950/70 via-indigo-950/60 to-slate-900 p-6 text-slate-100 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Vinculação
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Redes sociais
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Conecte Instagram, Facebook e WhatsApp para captar leads de anúncios
            e centralizar conversas. Por enquanto, é permitida apenas 1 conta
            por mídia em cada workspace.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                type: "INSTAGRAM_DIRECT" as const,
                title: "Instagram",
                icon: "📸",
                className: "border-fuchsia-400/30 bg-fuchsia-500/10"
              },
              {
                type: "FACEBOOK_MESSENGER" as const,
                title: "Facebook",
                icon: "📘",
                className: "border-blue-400/30 bg-blue-500/10"
              },
              {
                type: "WHATSAPP" as const,
                title: "WhatsApp",
                icon: "💬",
                className: "border-emerald-400/30 bg-emerald-500/10"
              }
            ].map((network) => {
              const account = socialAccounts[network.type];

              return (
                <article
                  key={network.type}
                  className={`rounded-2xl border p-4 ${network.className}`}
                >
                  <p className="text-sm text-slate-200">
                    {network.icon} {network.title}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {account
                      ? `Vinculada: ${account.name}`
                      : "Ainda não vinculada"}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {account
                      ? "Conta ativa para geração de leads e atendimento."
                      : "Faça a vinculação para habilitar captura de leads."}
                  </p>
                </article>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/integrations"
              className={buttonVariants({
                className: "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              })}
            >
              Abrir botão Redes Sociais
            </Link>
            <Link
              href="/admin/integrations"
              className={buttonVariants({
                variant: "outline",
                className:
                  "border-cyan-300/30 text-cyan-100 hover:border-cyan-300/60"
              })}
            >
              Vincular no site próprio
            </Link>
          </div>
        </section>
        <section className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-950/70 via-indigo-950/70 to-slate-900 p-6 text-violet-50 shadow-xl">
          <h2 className="text-lg font-semibold text-violet-100">OpenAI</h2>
          <p className="mt-1 text-sm text-violet-200/90">
            Informe a chave da API para habilitar respostas com IA no workspace.
          </p>
          <form
            onSubmit={handleSaveOpenAi}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
                OPENAI_API_KEY
              </label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-violet-300/30 bg-slate-900/50 px-4 py-3 text-sm text-violet-50 placeholder:text-violet-300/70"
                placeholder="sk-..."
                value={openAiForm.apiKey}
                onChange={(event) =>
                  setOpenAiForm((prev) => ({
                    ...prev,
                    apiKey: event.target.value
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
                OPENAI_MODEL
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-violet-300/30 bg-slate-900/50 px-4 py-3 text-sm text-violet-50"
                value={openAiForm.model}
                onChange={(event) =>
                  setOpenAiForm((prev) => ({
                    ...prev,
                    model: event.target.value
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
                OPENAI_BASE_URL
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-violet-300/30 bg-slate-900/50 px-4 py-3 text-sm text-violet-50"
                value={openAiForm.baseUrl}
                onChange={(event) =>
                  setOpenAiForm((prev) => ({
                    ...prev,
                    baseUrl: event.target.value
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={saving || loading}
                className="bg-violet-600 text-white hover:bg-violet-500"
              >
                {saving ? "Salvando..." : "Salvar OpenAI"}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/70 via-orange-950/65 to-slate-900 p-6 text-amber-50 shadow-xl">
          <h2 className="text-lg font-semibold text-amber-100">SMTP</h2>
          <p className="mt-1 text-sm text-amber-100/90">
            Configure o provedor de e-mail para disparos automáticos e
            notificações.
          </p>
          <form
            onSubmit={handleSaveSmtp}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-amber-100/90">
                SMTP_HOST
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-amber-300/30 bg-slate-900/50 px-4 py-3 text-sm text-amber-50"
                value={smtpForm.host}
                onChange={(event) =>
                  setSmtpForm((prev) => ({ ...prev, host: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-amber-100/90">
                SMTP_PORT
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-amber-300/30 bg-slate-900/50 px-4 py-3 text-sm text-amber-50"
                value={smtpForm.port}
                onChange={(event) =>
                  setSmtpForm((prev) => ({ ...prev, port: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-amber-100/90">
                SMTP_USER
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-amber-300/30 bg-slate-900/50 px-4 py-3 text-sm text-amber-50"
                value={smtpForm.user}
                onChange={(event) =>
                  setSmtpForm((prev) => ({ ...prev, user: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-amber-100/90">
                SMTP_PASS
              </label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-amber-300/30 bg-slate-900/50 px-4 py-3 text-sm text-amber-50 placeholder:text-amber-200/70"
                value={smtpForm.pass}
                onChange={(event) =>
                  setSmtpForm((prev) => ({ ...prev, pass: event.target.value }))
                }
                placeholder="Somente se quiser atualizar"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-amber-100/90">
                SMTP_FROM
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-amber-300/30 bg-slate-900/50 px-4 py-3 text-sm text-amber-50"
                value={smtpForm.from}
                onChange={(event) =>
                  setSmtpForm((prev) => ({ ...prev, from: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-amber-100/90">
                SMTP_SECURE
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-amber-300/30 bg-slate-900/50 px-4 py-3 text-sm text-amber-50"
                value={smtpForm.secure}
                onChange={(event) =>
                  setSmtpForm((prev) => ({
                    ...prev,
                    secure: event.target.value
                  }))
                }
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={saving || loading}
                className="bg-amber-500 text-slate-900 hover:bg-amber-400"
              >
                {saving ? "Salvando..." : "Salvar SMTP"}
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
