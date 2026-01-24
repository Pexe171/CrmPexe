"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type IntegrationAccountType = "WHATSAPP";
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

type SecretFormState = {
  apiUrl: string;
  apiToken: string;
  webhookToken: string;
  qrEndpoint: string;
  statusEndpoint: string;
  smsRequestEndpoint: string;
  smsVerifyEndpoint: string;
};

const emptyForm: IntegrationAccountFormState = {
  type: "WHATSAPP",
  name: "",
  status: "ACTIVE"
};

const emptySecretForm: SecretFormState = {
  apiUrl: "",
  apiToken: "",
  webhookToken: "",
  qrEndpoint: "",
  statusEndpoint: "",
  smsRequestEndpoint: "",
  smsVerifyEndpoint: ""
};

const typeOptions = [{ value: "WHATSAPP", label: "WhatsApp" }];
const statusOptions = [
  { value: "ACTIVE", label: "Ativa" },
  { value: "INACTIVE", label: "Inativa" }
];

export default function IntegrationsAdminPage() {
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<IntegrationAccountFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [secretForm, setSecretForm] = useState<SecretFormState>(emptySecretForm);
  const [submitting, setSubmitting] = useState(false);
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [smsRequestLoading, setSmsRequestLoading] = useState(false);
  const [smsVerifyLoading, setSmsVerifyLoading] = useState(false);

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

      const data = (await response.json()) as IntegrationAccount[];
      setAccounts(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar integrações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const handleChange =
    (field: keyof IntegrationAccountFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState((prev) => ({
        ...prev,
        [field]: event.target.value
      }));
    };

  const handleSecretChange =
    (field: keyof SecretFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setSecretForm((prev) => ({
        ...prev,
        [field]: event.target.value
      }));
    };

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      type: formState.type,
      name: formState.name,
      status: formState.status
    };

    try {
      const response = await fetch(
        `${apiUrl}/api/integration-accounts${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível salvar a integração.");
      }

      resetForm();
      await fetchAccounts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado ao salvar integração.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (account: IntegrationAccount) => {
    setEditingId(account.id);
    setFormState({
      type: account.type,
      name: account.name,
      status: account.status
    });
  };

  const handleDelete = async (accountId: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${accountId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível remover a integração.");
      }

      if (selectedAccountId === accountId) {
        setSelectedAccountId(null);
      }

      await fetchAccounts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro inesperado ao remover integração.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const buildQrImageUrl = (qr: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qr)}`;

  const applyQrStatus = useCallback((payload: { qr?: string | null; status?: string | null }) => {
    setQrStatus(payload.status ?? "connecting");
    if (payload.qr) {
      setQrImageUrl(buildQrImageUrl(payload.qr));
      return;
    }
    setQrImageUrl(null);
  }, []);

  const qrStatusLabel = useMemo(() => {
    if (!qrStatus) {
      return "aguardando seleção";
    }
    if (qrStatus === "connected") {
      return "conectado";
    }
    if (qrStatus === "disconnected") {
      return "desconectado";
    }
    return "conectando";
  }, [qrStatus]);

  const fetchWhatsappStatus = useCallback(async (accountId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${accountId}/whatsapp/status`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível consultar o status do WhatsApp.");
      }

      const data = (await response.json()) as { qr?: string | null; status?: string | null };
      applyQrStatus(data);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Erro ao consultar status do WhatsApp.");
    }
  }, [applyQrStatus]);

  const handleRequestQr = useCallback(async () => {
    if (!selectedAccountId) {
      return;
    }

    setQrLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${selectedAccountId}/whatsapp/qr`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível gerar o QR code do WhatsApp.");
      }

      const data = (await response.json()) as { qr?: string | null; status?: string | null };
      applyQrStatus(data);
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : "Erro ao gerar QR code.");
    } finally {
      setQrLoading(false);
    }
  }, [applyQrStatus, selectedAccountId]);

  const handleRequestSms = useCallback(async () => {
    if (!selectedAccountId) {
      return;
    }

    const trimmedPhone = smsPhone.trim();
    if (!trimmedPhone) {
      setError("Informe o número para receber o SMS.");
      return;
    }

    setSmsRequestLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${selectedAccountId}/whatsapp/sms/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ phone: trimmedPhone })
      });

      if (!response.ok) {
        throw new Error("Não foi possível solicitar o SMS do WhatsApp.");
      }

      const data = (await response.json()) as { status?: string | null };
      setSmsStatus(data.status ?? "codigo_enviado");
    } catch (smsError) {
      setError(smsError instanceof Error ? smsError.message : "Erro ao solicitar SMS.");
    } finally {
      setSmsRequestLoading(false);
    }
  }, [selectedAccountId, smsPhone]);

  const handleVerifySms = useCallback(async () => {
    if (!selectedAccountId) {
      return;
    }

    const trimmedPhone = smsPhone.trim();
    const trimmedCode = smsCode.trim();

    if (!trimmedPhone || !trimmedCode) {
      setError("Informe o número e o código recebido por SMS.");
      return;
    }

    setSmsVerifyLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${selectedAccountId}/whatsapp/sms/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ phone: trimmedPhone, code: trimmedCode })
      });

      if (!response.ok) {
        throw new Error("Não foi possível validar o SMS do WhatsApp.");
      }

      const data = (await response.json()) as { status?: string | null };
      setSmsStatus(data.status ?? "verificado");
      void fetchWhatsappStatus(selectedAccountId);
    } catch (smsError) {
      setError(smsError instanceof Error ? smsError.message : "Erro ao validar SMS.");
    } finally {
      setSmsVerifyLoading(false);
    }
  }, [fetchWhatsappStatus, selectedAccountId, smsCode, smsPhone]);

  useEffect(() => {
    if (!activeAccount) {
      setQrStatus(null);
      setQrImageUrl(null);
      setSmsStatus(null);
      return;
    }

    void fetchWhatsappStatus(activeAccount.id);
    const interval = setInterval(() => {
      void fetchWhatsappStatus(activeAccount.id);
    }, 8000);

    return () => clearInterval(interval);
  }, [activeAccount, fetchWhatsappStatus]);

  const handleSaveSecrets = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAccountId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = Object.entries(secretForm).reduce<Record<string, string>>((acc, [key, value]) => {
      const trimmed = value.trim();
      if (trimmed) {
        acc[key] = trimmed;
      }
      return acc;
    }, {});

    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${selectedAccountId}/secret`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ payload })
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar os segredos da integração.");
      }

      setSecretForm(emptySecretForm);
      await fetchAccounts();
    } catch (secretError) {
      setError(secretError instanceof Error ? secretError.message : "Erro inesperado ao salvar segredos.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">Central de Integrações</h1>
          <p className="text-sm text-gray-500">
            Cadastre contas de integração e armazene credenciais criptografadas.
          </p>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            Voltar ao dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Integrações configuradas</h2>
          <p className="text-sm text-gray-500">Selecione uma integração para conectar segredos.</p>

          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm text-gray-500">Carregando integrações...</p>}
            {!loading && accounts.length === 0 && (
              <p className="text-sm text-gray-500">Nenhuma integração cadastrada.</p>
            )}
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`rounded-lg border p-4 transition ${
                  selectedAccountId === account.id ? "border-blue-600 bg-blue-50" : "border-gray-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{account.name}</h3>
                    <p className="text-sm text-gray-500">Tipo: {account.type}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 font-medium ${
                          account.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {account.status === "ACTIVE" ? "Ativa" : "Inativa"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 font-medium ${
                          account.hasSecret ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {account.hasSecret ? "Credenciais salvas" : "Sem credenciais"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setSecretForm(emptySecretForm);
                        setQrStatus(null);
                        setQrImageUrl(null);
                        setSmsPhone("");
                        setSmsCode("");
                        setSmsStatus(null);
                      }}
                    >
                      Conectar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(account)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(account.id)}>
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Editar integração" : "Nova integração"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={formState.type}
                  onChange={handleChange("type")}
                  disabled={Boolean(editingId)}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nome da integração</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Ex: WhatsApp Principal"
                  value={formState.name}
                  onChange={handleChange("name")}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
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
              <div className="flex flex-wrap gap-2">
                <Button disabled={submitting} type="submit">
                  {editingId ? "Salvar alterações" : "Cadastrar"}
                </Button>
                {editingId && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Segredos da integração</h2>
            <p className="text-sm text-gray-500">
              {activeAccount
                ? `Conecte credenciais para ${activeAccount.name}.`
                : "Selecione uma integração para conectar."}
            </p>
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Para WhatsApp API via token, basta preencher API URL e API Token.
            </div>
            <form onSubmit={handleSaveSecrets} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">API URL</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="https://api.whatsapp.com"
                  value={secretForm.apiUrl}
                  onChange={handleSecretChange("apiUrl")}
                  disabled={!activeAccount}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">API Token</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Token da API"
                  value={secretForm.apiToken}
                  onChange={handleSecretChange("apiToken")}
                  disabled={!activeAccount}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Webhook Token (opcional)</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Token de validação"
                  value={secretForm.webhookToken}
                  onChange={handleSecretChange("webhookToken")}
                  disabled={!activeAccount}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Endpoint do QR (opcional)</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="/whatsapp/qr"
                  value={secretForm.qrEndpoint}
                  onChange={handleSecretChange("qrEndpoint")}
                  disabled={!activeAccount}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Endpoint de status (opcional)</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="/whatsapp/status"
                  value={secretForm.statusEndpoint}
                  onChange={handleSecretChange("statusEndpoint")}
                  disabled={!activeAccount}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Endpoint SMS (solicitar) (opcional)</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="/whatsapp/sms/request"
                  value={secretForm.smsRequestEndpoint}
                  onChange={handleSecretChange("smsRequestEndpoint")}
                  disabled={!activeAccount}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Endpoint SMS (validar) (opcional)</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="/whatsapp/sms/verify"
                  value={secretForm.smsVerifyEndpoint}
                  onChange={handleSecretChange("smsVerifyEndpoint")}
                  disabled={!activeAccount}
                />
              </div>
              <Button disabled={!activeAccount || submitting} type="submit">
                Salvar credenciais
              </Button>
            </form>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Conexão via QR code</h2>
            <p className="text-sm text-gray-500">
              {activeAccount
                ? "Gere o QR code e faça a leitura no WhatsApp para conectar."
                : "Selecione uma integração para gerar o QR code."}
            </p>
            <div className="mt-4 space-y-4">
              <div className="text-sm text-gray-600">
                Status: {qrStatusLabel}
              </div>
              {qrImageUrl ? (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImageUrl} alt="QR code do WhatsApp" className="h-60 w-60" />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                  QR code aparecerá aqui.
                </div>
              )}
              <Button disabled={!activeAccount || qrLoading} onClick={handleRequestQr}>
                {qrLoading ? "Gerando QR..." : "Gerar QR code"}
              </Button>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Conexão via SMS</h2>
            <p className="text-sm text-gray-500">
              {activeAccount
                ? "Digite o número, solicite o SMS e valide o código como no WhatsApp Web."
                : "Selecione uma integração para solicitar o SMS."}
            </p>
            <div className="mt-4 space-y-4">
              <div className="text-sm text-gray-600">
                Status: {smsStatus ? smsStatus.replaceAll("_", " ") : "aguardando solicitação"}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Número com DDI</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="+55 11 99999-9999"
                  value={smsPhone}
                  onChange={(event) => setSmsPhone(event.target.value)}
                  disabled={!activeAccount}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!activeAccount || smsRequestLoading} onClick={handleRequestSms}>
                  {smsRequestLoading ? "Enviando SMS..." : "Solicitar SMS"}
                </Button>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Código recebido</label>
                <input
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="123456"
                  value={smsCode}
                  onChange={(event) => setSmsCode(event.target.value)}
                  disabled={!activeAccount}
                />
              </div>
              <Button disabled={!activeAccount || smsVerifyLoading} onClick={handleVerifySms}>
                {smsVerifyLoading ? "Validando..." : "Validar código"}
              </Button>
            </div>
          </section>

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
