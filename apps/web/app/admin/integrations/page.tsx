"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const supportFallbackUrl = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "";

type IntegrationAccountType =
  | "WHATSAPP"
  | "OPENAI"
  | "EMAIL"
  | "INSTAGRAM_DIRECT"
  | "FACEBOOK_MESSENGER"
  | "VOIP"
  | "N8N";
type IntegrationAccountStatus = "ACTIVE" | "INACTIVE";

type IntegrationAccount = {
  id: string;
  workspaceId: string;
  type: IntegrationAccountType;
  name: string;
  status: IntegrationAccountStatus;
  createdAt: string;
  updatedAt: string;
  hasSecret: boolean;
};

type IntegrationAccountFormState = {
  type: IntegrationAccountType;
  name: string;
  status: IntegrationAccountStatus;
};

type SecretFormState = Record<string, string>;

type WhatsappStatusResponse = {
  qr?: string | null;
  status?: string | null;
  needsSupport?: boolean;
  message?: string;
  supportContactUrl?: string | null;
};

type WhatsappSession = {
  id: string;
  provider: string;
  sessionName: string;
  status: string;
  updatedAt: string;
};

type SecretField = {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password";
  required?: boolean;
};

const typeOptions: Array<{ value: IntegrationAccountType; label: string }> = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "OPENAI", label: "OpenAI" },
  { value: "EMAIL", label: "E-mail (SMTP)" },
  { value: "INSTAGRAM_DIRECT", label: "Instagram Direct" },
  { value: "FACEBOOK_MESSENGER", label: "Facebook Messenger" },
  { value: "VOIP", label: "VoIP" },
  { value: "N8N", label: "N8N" }
];

const secretFieldsByType: Record<IntegrationAccountType, SecretField[]> = {
  WHATSAPP: [
    { key: "apiUrl", label: "API URL", placeholder: "https://..." },
    {
      key: "apiToken",
      label: "API Token",
      placeholder: "Token da API",
      type: "password"
    },
    {
      key: "provider",
      label: "Provider",
      placeholder: "EVOLUTION ou QR"
    },
    {
      key: "sessionName",
      label: "Nome da sessão",
      placeholder: "nome-opcional"
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      placeholder: "Segredo da assinatura",
      type: "password"
    },
    {
      key: "qrEndpoint",
      label: "QR Endpoint",
      placeholder: "/whatsapp/qr"
    },
    {
      key: "statusEndpoint",
      label: "Status Endpoint",
      placeholder: "/whatsapp/status"
    },
    {
      key: "smsRequestEndpoint",
      label: "SMS Request Endpoint",
      placeholder: "/whatsapp/sms/request"
    },
    {
      key: "smsVerifyEndpoint",
      label: "SMS Verify Endpoint",
      placeholder: "/whatsapp/sms/verify"
    }
  ],
  OPENAI: [
    {
      key: "apiKey",
      label: "OpenAI API Key",
      placeholder: "sk-...",
      type: "password",
      required: true
    },
    {
      key: "model",
      label: "Modelo",
      placeholder: "gpt-4o-mini",
      required: true
    },
    {
      key: "baseUrl",
      label: "Base URL",
      placeholder: "https://api.openai.com/v1"
    }
  ],
  EMAIL: [
    {
      key: "smtpHost",
      label: "SMTP Host",
      placeholder: "smtp.gmail.com",
      required: true
    },
    { key: "smtpPort", label: "SMTP Port", placeholder: "465", required: true },
    {
      key: "smtpUser",
      label: "SMTP User",
      placeholder: "seu-email@dominio.com",
      required: true
    },
    {
      key: "smtpPass",
      label: "SMTP Pass",
      placeholder: "senha de app",
      type: "password",
      required: true
    },
    {
      key: "smtpFrom",
      label: "SMTP From",
      placeholder: "CrmPexe <seu-email@dominio.com>",
      required: true
    },
    { key: "smtpSecure", label: "SMTP Secure", placeholder: "true ou false" },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      placeholder: "segredo para validar inbound",
      type: "password"
    }
  ],
  INSTAGRAM_DIRECT: [
    { key: "apiUrl", label: "API URL", placeholder: "https://..." },
    {
      key: "apiToken",
      label: "API Token",
      placeholder: "Token",
      type: "password"
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      placeholder: "Assinatura",
      type: "password"
    }
  ],
  FACEBOOK_MESSENGER: [
    { key: "apiUrl", label: "API URL", placeholder: "https://..." },
    {
      key: "apiToken",
      label: "API Token",
      placeholder: "Token",
      type: "password"
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      placeholder: "Assinatura",
      type: "password"
    }
  ],
  VOIP: [
    { key: "apiUrl", label: "API URL", placeholder: "https://..." },
    {
      key: "apiToken",
      label: "API Token",
      placeholder: "Token",
      type: "password"
    }
  ],
  N8N: [
    { key: "baseUrl", label: "Base URL", placeholder: "https://seu-n8n" },
    {
      key: "apiKey",
      label: "API Key",
      placeholder: "chave do n8n",
      type: "password"
    }
  ]
};

const emptyForm: IntegrationAccountFormState = {
  type: "WHATSAPP",
  name: "",
  status: "ACTIVE"
};

const statusOptions = [
  { value: "ACTIVE", label: "Ativa" },
  { value: "INACTIVE", label: "Inativa" }
];

const getDefaultSecretForm = (
  type: IntegrationAccountType
): SecretFormState => {
  const fields = secretFieldsByType[type] ?? [];
  return fields.reduce<SecretFormState>((acc, field) => {
    acc[field.key] = field.key === "provider" ? "EVOLUTION" : "";
    return acc;
  }, {});
};

export default function IntegrationsAdminPage() {
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [sessions, setSessions] = useState<WhatsappSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [supportUrl, setSupportUrl] = useState<string>(supportFallbackUrl);

  const [formState, setFormState] =
    useState<IntegrationAccountFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [secretForm, setSecretForm] = useState<SecretFormState>(
    getDefaultSecretForm(emptyForm.type)
  );

  const [submitting, setSubmitting] = useState(false);
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Não foi possível carregar as integrações.");
      }
      setAccounts((await response.json()) as IntegrationAccount[]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao carregar integrações."
      );
    } finally {
      setLoading(false);
    }
  }, []);


  const fetchSessions = useCallback(async (accountId: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/integration-accounts/${accountId}/whatsapp/sessions`,
        {
          credentials: "include"
        }
      );
      if (!response.ok) {
        return;
      }
      setSessions((await response.json()) as WhatsappSession[]);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const isWhatsappSelected = activeAccount?.type === "WHATSAPP";
  const activeSecretFields = activeAccount
    ? (secretFieldsByType[activeAccount.type] ?? [])
    : [];

  const handleChange =
    (field: keyof IntegrationAccountFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target
        .value as IntegrationAccountFormState[keyof IntegrationAccountFormState];
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleSecretChange =
    (field: string) => (event: ChangeEvent<HTMLInputElement>) => {
      setSecretForm((prev) => ({ ...prev, [field]: event.target.value }));
    };


  const resetForm = () => {
    setFormState(emptyForm);
    setEditingId(null);
  };

  const resetSecretsForAccount = useCallback((type: IntegrationAccountType) => {
    setSecretForm(getDefaultSecretForm(type));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/integration-accounts${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formState)
        }
      );
      if (!response.ok) {
        throw new Error("Não foi possível salvar a integração.");
      }
      resetForm();
      await fetchAccounts();
      setSuccess("Integração salva com sucesso.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro inesperado ao salvar integração."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${apiUrl}/api/integration-accounts/${accountId}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );
      if (!response.ok) {
        throw new Error("Não foi possível remover a integração.");
      }
      await fetchAccounts();
      if (selectedAccountId === accountId) {
        setSelectedAccountId(null);
      }
      setSuccess("Integração removida com sucesso.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Erro inesperado ao remover integração."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const buildQrImageUrl = (qr: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qr)}`;

  const applyWhatsappResponse = useCallback(
    (payload: WhatsappStatusResponse) => {
      setQrStatus(payload.status ?? "connecting");
      setQrImageUrl(payload.qr ? buildQrImageUrl(payload.qr) : null);

      if (payload.needsSupport) {
        setSupportMessage(
          payload.message || "A API do cliente não está configurada."
        );
        setSupportUrl(payload.supportContactUrl || supportFallbackUrl);
        return;
      }

      setSupportMessage(null);
    },
    []
  );

  const fetchWhatsappStatus = useCallback(
    async (accountId: string) => {
      try {
        const response = await fetch(
          `${apiUrl}/api/integration-accounts/${accountId}/whatsapp/status`,
          {
            credentials: "include"
          }
        );
        if (!response.ok) {
          throw new Error("Não foi possível consultar o status do WhatsApp.");
        }
        applyWhatsappResponse(
          (await response.json()) as WhatsappStatusResponse
        );
        await fetchSessions(accountId);
      } catch (statusError) {
        setError(
          statusError instanceof Error
            ? statusError.message
            : "Erro ao consultar status do WhatsApp."
        );
      }
    },
    [applyWhatsappResponse, fetchSessions]
  );

  const handleRequestQr = useCallback(async () => {
    if (!selectedAccountId) {
      return;
    }

    setQrLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/integration-accounts/${selectedAccountId}/whatsapp/qr`,
        {
          method: "POST",
          credentials: "include"
        }
      );
      if (!response.ok) {
        throw new Error("Não foi possível gerar o QR code do WhatsApp.");
      }
      applyWhatsappResponse((await response.json()) as WhatsappStatusResponse);
      await fetchSessions(selectedAccountId);
    } catch (qrError) {
      setError(
        qrError instanceof Error ? qrError.message : "Erro ao gerar QR code."
      );
    } finally {
      setQrLoading(false);
    }
  }, [applyWhatsappResponse, fetchSessions, selectedAccountId]);

  const handleConnectEvolution = useCallback(async () => {
    if (!selectedAccountId) {
      return;
    }

    setQrLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/integration-accounts/${selectedAccountId}/whatsapp/evolution/connect`,
        {
          method: "POST",
          credentials: "include"
        }
      );
      if (!response.ok) {
        throw new Error("Não foi possível iniciar conexão Evolution.");
      }
      applyWhatsappResponse((await response.json()) as WhatsappStatusResponse);
      await fetchSessions(selectedAccountId);
    } catch (qrError) {
      setError(
        qrError instanceof Error
          ? qrError.message
          : "Erro ao iniciar conexão Evolution."
      );
    } finally {
      setQrLoading(false);
    }
  }, [applyWhatsappResponse, fetchSessions, selectedAccountId]);

  useEffect(() => {
    if (!activeAccount || activeAccount.type !== "WHATSAPP") {
      setQrStatus(null);
      setQrImageUrl(null);
      setSupportMessage(null);
      setSessions([]);
      return;
    }

    void fetchWhatsappStatus(activeAccount.id);
    const interval = setInterval(
      () => void fetchWhatsappStatus(activeAccount.id),
      10000
    );
    return () => clearInterval(interval);
  }, [activeAccount, fetchWhatsappStatus]);

  const handleSaveSecrets = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeAccount) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = Object.entries(secretForm).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        const trimmed = value.trim();
        if (trimmed) {
          acc[key] = trimmed;
        }
        return acc;
      },
      {}
    );

    try {
      const response = await fetch(
        `${apiUrl}/api/integration-accounts/${activeAccount.id}/secret`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ payload })
        }
      );
      if (!response.ok) {
        throw new Error("Não foi possível salvar os segredos da integração.");
      }
      await fetchAccounts();
      setSuccess("Segredos salvos com sucesso.");
    } catch (secretError) {
      setError(
        secretError instanceof Error
          ? secretError.message
          : "Erro inesperado ao salvar segredos."
      );
    } finally {
      setSubmitting(false);
    }
  };


  const qrStatusLabel = !qrStatus
    ? "aguardando seleção"
    : qrStatus === "connected"
      ? "conectado"
      : "conectando";

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Central de Integrações
          </h1>
          <p className="text-sm text-gray-500">
            Configure as integrações do cliente (OpenAI, WhatsApp, E-mail e mais)
            com segredos criptografados por workspace.
          </p>
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_340px]">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Integrações configuradas
          </h2>

          <div className="mt-4 space-y-3">
            {loading && (
              <p className="text-sm text-gray-500">Carregando integrações...</p>
            )}
            {!loading && accounts.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhuma integração cadastrada.
              </p>
            )}

            {accounts.map((account) => (
              <div
                key={account.id}
                className={`rounded-lg border p-4 ${selectedAccountId === account.id ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {account.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Tipo:{" "}
                      {typeOptions.find((item) => item.value === account.type)
                        ?.label ?? account.type}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        resetSecretsForAccount(account.type);
                      }}
                    >
                      Configurar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(account.id);
                        setFormState({
                          type: account.type,
                          name: account.name,
                          status: account.status
                        });
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDelete(account.id)}
                      disabled={submitting}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-4 rounded-lg border border-gray-100 p-4"
          >
            <h3 className="text-base font-semibold text-gray-800">
              {editingId ? "Editar integração" : "Nova integração"}
            </h3>

            <div>
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={formState.type}
                onChange={handleChange("type")}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Nome</label>
              <input
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={formState.name}
                onChange={handleChange("name")}
                placeholder="Ex.: E-mail Comercial"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={formState.status}
                onChange={handleChange("status")}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={submitting}>
              {editingId ? "Salvar alterações" : "Criar integração"}
            </Button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Credenciais da integração
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeAccount
                ? `Conta selecionada: ${activeAccount.name}`
                : "Selecione uma integração para informar os segredos."}
            </p>

            <form onSubmit={handleSaveSecrets} className="mt-4 space-y-3">
              {activeSecretFields.length === 0 && (
                <p className="text-sm text-gray-500">
                  Nenhum campo para o tipo selecionado.
                </p>
              )}

              {activeSecretFields.map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-medium text-gray-700">
                    {field.label}
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    type={field.type ?? "text"}
                    placeholder={field.placeholder}
                    value={secretForm[field.key] ?? ""}
                    onChange={handleSecretChange(field.key)}
                    disabled={!activeAccount}
                    required={Boolean(field.required)}
                  />
                </div>
              ))}

              <Button type="submit" disabled={!activeAccount || submitting}>
                Salvar credenciais
              </Button>
            </form>
          </section>

          {isWhatsappSelected && (
            <>
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">
                  Conectar WhatsApp
                </h2>
                <p className="text-sm text-gray-500">Status: {qrStatusLabel}</p>
                {qrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrImageUrl}
                    alt="QR code do WhatsApp"
                    className="mt-4 h-60 w-60"
                  />
                ) : (
                  <div className="mt-4 rounded border border-dashed p-4 text-center text-sm text-gray-400">
                    QR code aparecerá aqui.
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={!activeAccount || qrLoading}
                    onClick={handleRequestQr}
                  >
                    {qrLoading ? "Gerando..." : "Gerar QR code"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!activeAccount || qrLoading}
                    onClick={handleConnectEvolution}
                  >
                    Conectar via Evolution
                  </Button>
                </div>
                {supportMessage && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p>{supportMessage}</p>
                    {supportUrl && (
                      <a
                        href={supportUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block font-medium text-amber-900 underline"
                      >
                        Entrar em contato com suporte
                      </a>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">
                  Sessões (por perfil)
                </h2>
                <p className="text-sm text-gray-500">
                  No momento, as sessões ficam vinculadas ao perfil do usuário.
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {sessions.length === 0 && (
                    <li className="text-gray-500">Nenhuma sessão ainda.</li>
                  )}
                  {sessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded border border-gray-200 p-2"
                    >
                      <p className="font-medium text-gray-800">
                        {session.sessionName}
                      </p>
                      <p className="text-gray-500">
                        Provider: {session.provider} • Status: {session.status}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}


          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
