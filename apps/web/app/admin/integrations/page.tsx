"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const supportFallbackUrl = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "";

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
  provider: string;
  sessionName: string;
  qrEndpoint: string;
  statusEndpoint: string;
  smsRequestEndpoint: string;
  smsVerifyEndpoint: string;
};

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

const emptyForm: IntegrationAccountFormState = {
  type: "WHATSAPP",
  name: "",
  status: "ACTIVE"
};

const emptySecretForm: SecretFormState = {
  apiUrl: "",
  apiToken: "",
  provider: "EVOLUTION",
  sessionName: "",
  qrEndpoint: "",
  statusEndpoint: "",
  smsRequestEndpoint: "",
  smsVerifyEndpoint: ""
};

const statusOptions = [
  { value: "ACTIVE", label: "Ativa" },
  { value: "INACTIVE", label: "Inativa" }
];

export default function IntegrationsAdminPage() {
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [sessions, setSessions] = useState<WhatsappSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [supportUrl, setSupportUrl] = useState<string>(supportFallbackUrl);
  const [formState, setFormState] = useState<IntegrationAccountFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [secretForm, setSecretForm] = useState<SecretFormState>(emptySecretForm);
  const [submitting, setSubmitting] = useState(false);
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts`, { credentials: "include" });
      if (!response.ok) throw new Error("Não foi possível carregar as integrações.");
      setAccounts((await response.json()) as IntegrationAccount[]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar integrações.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async (accountId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${accountId}/whatsapp/sessions`, {
        credentials: "include"
      });
      if (!response.ok) return;
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

  const handleChange =
    (field: keyof IntegrationAccountFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSecretChange =
    (field: keyof SecretFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSecretForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formState)
      });
      if (!response.ok) throw new Error("Não foi possível salvar a integração.");
      resetForm();
      await fetchAccounts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado ao salvar integração.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${accountId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Não foi possível remover a integração.");
      await fetchAccounts();
      if (selectedAccountId === accountId) setSelectedAccountId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro inesperado ao remover integração.");
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
        setSupportMessage(payload.message || "A API do cliente não está configurada.");
        setSupportUrl(payload.supportContactUrl || supportFallbackUrl);
      } else {
        setSupportMessage(null);
      }
    },
    []
  );

  const fetchWhatsappStatus = useCallback(
    async (accountId: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/integration-accounts/${accountId}/whatsapp/status`, {
          credentials: "include"
        });
        if (!response.ok) throw new Error("Não foi possível consultar o status do WhatsApp.");
        applyWhatsappResponse((await response.json()) as WhatsappStatusResponse);
        await fetchSessions(accountId);
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : "Erro ao consultar status do WhatsApp.");
      }
    },
    [applyWhatsappResponse, fetchSessions]
  );

  const handleRequestQr = useCallback(async () => {
    if (!selectedAccountId) return;
    setQrLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${selectedAccountId}/whatsapp/qr`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Não foi possível gerar o QR code do WhatsApp.");
      applyWhatsappResponse((await response.json()) as WhatsappStatusResponse);
      await fetchSessions(selectedAccountId);
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : "Erro ao gerar QR code.");
    } finally {
      setQrLoading(false);
    }
  }, [applyWhatsappResponse, fetchSessions, selectedAccountId]);

  const handleConnectEvolution = useCallback(async () => {
    if (!selectedAccountId) return;
    setQrLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${selectedAccountId}/whatsapp/evolution/connect`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Não foi possível iniciar conexão Evolution.");
      applyWhatsappResponse((await response.json()) as WhatsappStatusResponse);
      await fetchSessions(selectedAccountId);
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : "Erro ao iniciar Evolution.");
    } finally {
      setQrLoading(false);
    }
  }, [applyWhatsappResponse, fetchSessions, selectedAccountId]);

  useEffect(() => {
    if (!activeAccount) {
      setQrStatus(null);
      setQrImageUrl(null);
      setSupportMessage(null);
      setSessions([]);
      return;
    }

    void fetchWhatsappStatus(activeAccount.id);
    const interval = setInterval(() => void fetchWhatsappStatus(activeAccount.id), 10000);
    return () => clearInterval(interval);
  }, [activeAccount, fetchWhatsappStatus]);

  const handleSaveSecrets = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAccountId) return;

    setSubmitting(true);
    setError(null);

    const payload = Object.entries(secretForm).reduce<Record<string, string>>((acc, [key, value]) => {
      const trimmed = value.trim();
      if (trimmed) acc[key] = trimmed;
      return acc;
    }, {});

    try {
      const response = await fetch(`${apiUrl}/api/integration-accounts/${selectedAccountId}/secret`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payload })
      });
      if (!response.ok) throw new Error("Não foi possível salvar os segredos da integração.");
      await fetchAccounts();
    } catch (secretError) {
      setError(secretError instanceof Error ? secretError.message : "Erro inesperado ao salvar segredos.");
    } finally {
      setSubmitting(false);
    }
  };

  const qrStatusLabel = !qrStatus ? "aguardando seleção" : qrStatus === "connected" ? "conectado" : "conectando";

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">Central de Integrações</h1>
          <p className="text-sm text-gray-500">Adicione WhatsApp via QR ou API Evolution.</p>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            Voltar ao dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_340px]">
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Integrações configuradas</h2>
          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm text-gray-500">Carregando integrações...</p>}
            {!loading && accounts.length === 0 && <p className="text-sm text-gray-500">Nenhuma integração cadastrada.</p>}
            {accounts.map((account) => (
              <div key={account.id} className={`rounded-lg border p-4 ${selectedAccountId === account.id ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{account.name}</h3>
                    <p className="text-sm text-gray-500">Tipo: {account.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedAccountId(account.id)}>Conectar</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(account.id); setFormState({ type: account.type, name: account.name, status: account.status }); }}>Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => void handleDelete(account.id)} disabled={submitting}>Remover</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 rounded-lg border border-gray-100 p-4">
            <h3 className="text-base font-semibold text-gray-800">{editingId ? "Editar integração" : "Nova integração"}</h3>
            <div>
              <label className="text-sm font-medium text-gray-700">Nome</label>
              <input className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={formState.name} onChange={handleChange("name")} placeholder="WhatsApp comercial" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={formState.status} onChange={handleChange("status")}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={submitting}>{editingId ? "Salvar alterações" : "Criar integração"}</Button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Credenciais</h2>
            <form onSubmit={handleSaveSecrets} className="mt-4 space-y-3">
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="API URL" value={secretForm.apiUrl} onChange={handleSecretChange("apiUrl")} disabled={!activeAccount} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="API Token" value={secretForm.apiToken} onChange={handleSecretChange("apiToken")} disabled={!activeAccount} />
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={secretForm.provider} onChange={handleSecretChange("provider")} disabled={!activeAccount}>
                <option value="EVOLUTION">Evolution API</option>
                <option value="QR">QR padrão</option>
              </select>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Nome da sessão (opcional)" value={secretForm.sessionName} onChange={handleSecretChange("sessionName")} disabled={!activeAccount} />
              <Button type="submit" disabled={!activeAccount || submitting}>Salvar credenciais</Button>
            </form>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Conectar WhatsApp</h2>
            <p className="text-sm text-gray-500">Status: {qrStatusLabel}</p>
            {qrImageUrl ? (<>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="QR code do WhatsApp" className="mt-4 h-60 w-60" />
            </>) : <div className="mt-4 rounded border border-dashed p-4 text-center text-sm text-gray-400">QR code aparecerá aqui.</div>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={!activeAccount || qrLoading} onClick={handleRequestQr}>{qrLoading ? "Gerando..." : "Gerar QR code"}</Button>
              <Button variant="outline" disabled={!activeAccount || qrLoading} onClick={handleConnectEvolution}>Conectar via Evolution</Button>
            </div>
            {supportMessage && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p>{supportMessage}</p>
                {supportUrl && <a href={supportUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-medium text-amber-900 underline">Entrar em contato com suporte</a>}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Sessões (por perfil)</h2>
            <p className="text-sm text-gray-500">No momento, as sessões ficam vinculadas ao perfil do usuário.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {sessions.length === 0 && <li className="text-gray-500">Nenhuma sessão ainda.</li>}
              {sessions.map((session) => (
                <li key={session.id} className="rounded border border-gray-200 p-2">
                  <p className="font-medium text-gray-800">{session.sessionName}</p>
                  <p className="text-gray-500">Provider: {session.provider} • Status: {session.status}</p>
                </li>
              ))}
            </ul>
          </section>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        </aside>
      </main>
    </div>
  );
}
