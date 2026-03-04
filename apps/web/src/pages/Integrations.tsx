import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationsApi } from "@/lib/api/integrations";
import type { IntegrationAccount, WhatsappQrResponse } from "@/lib/api/integrations";
import { IntegrationKeysDialog } from "@/components/integrations/IntegrationKeysDialog";
import { useWhatsappSocketStore } from "@/stores/whatsapp-socket";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Plug, MessageSquare, Plus, Trash2, QrCode, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Loader2, Smartphone,
  Shield, Wifi, WifiOff, Bot, Workflow
} from "lucide-react";

type IntegrationType = "WHATSAPP" | "OPENAI" | "EMAIL" | "N8N" | "INSTAGRAM_DIRECT" | "FACEBOOK_MESSENGER" | "VOIP";

const typeConfig: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  WHATSAPP: { label: "WhatsApp", icon: MessageSquare, color: "text-green-400" },
  OPENAI: { label: "OpenAI", icon: Shield, color: "text-purple-400" },
  EMAIL: { label: "E-mail", icon: Plug, color: "text-blue-400" },
  N8N: { label: "n8n", icon: Plug, color: "text-orange-400" },
  INSTAGRAM_DIRECT: { label: "Instagram", icon: Plug, color: "text-pink-400" },
  FACEBOOK_MESSENGER: { label: "Messenger", icon: Plug, color: "text-blue-500" },
  VOIP: { label: "VoIP", icon: Plug, color: "text-cyan-400" },
};

type WhatsappMode = "choice" | "native" | "api";

function WhatsappQrPanel({ account }: { account: IntegrationAccount }) {
  const queryClient = useQueryClient();
  const [qrData, setQrData] = useState<WhatsappQrResponse | null>(null);
  const [polling, setPolling] = useState(false);
  const [secretsConfigured, setSecretsConfigured] = useState(account.hasSecret);
  const [mode, setMode] = useState<WhatsappMode>(account.hasSecret ? "api" : "choice");

  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");

  const isNativeSession = mode === "native";
  const socketQr = useWhatsappSocketStore((s) => s.qrByAccount[account.id]);
  const socketConnected = useWhatsappSocketStore((s) => s.connectedByAccount[account.id]);
  const clearWhatsappStore = useWhatsappSocketStore((s) => s.clear);

  useEffect(() => {
    if (socketConnected && isNativeSession) {
      setPolling(false);
      setQrData((prev) => (prev ? { ...prev, status: "connected", qr: null } : null));
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", account.id] });
      toast.success("WhatsApp conectado!");
      clearWhatsappStore(account.id);
    }
  }, [socketConnected, isNativeSession, account.id, queryClient, clearWhatsappStore]);

  const displayQr = isNativeSession && socketQr ? socketQr : qrData?.qr ?? null;

  const saveSecretsMutation = useMutation({
    mutationFn: () => integrationsApi.upsertSecret(account.id, {
      apiUrl: apiUrl.trim(),
      apiToken: apiToken.trim(),
      provider: "QR"
    }),
    onSuccess: () => {
      setSecretsConfigured(true);
      setMode("api");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    }
  });

  const requestQrMutation = useMutation({
    mutationFn: async (useNative?: boolean) => {
      const useNativeApi = useNative ?? isNativeSession;
      if (import.meta.env?.DEV) {
        console.debug("[CrmPexe WhatsApp]", "Gerar QR", { useNativeApi, accountId: account.id });
      }
      const res = useNativeApi
        ? await integrationsApi.requestNativeWhatsappQr(account.id)
        : await integrationsApi.requestWhatsappQr(account.id);
      if (import.meta.env?.DEV) {
        console.debug("[CrmPexe WhatsApp]", "Resposta QR", { hasQr: !!res.qr, status: res.status, needsSupport: res.needsSupport });
      }
      return res;
    },
    onSuccess: (data) => {
      setQrData(data);
      const waiting = data.status !== "connected" && data.status !== "ready";
      if (waiting) {
        setPolling(true);
      }
      if (data.status === "connected" || data.status === "ready") {
        setPolling(false);
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", account.id] });
      }
    },
    onError: (err) => {
      if (import.meta.env?.DEV) {
        console.warn("[CrmPexe WhatsApp]", "Erro ao gerar QR", err);
      }
    }
  });

  const pollStatus = useCallback(async () => {
    try {
      const status = isNativeSession
        ? await integrationsApi.getNativeWhatsappStatus(account.id)
        : await integrationsApi.getWhatsappStatus(account.id);
      if (import.meta.env?.DEV && (status.qr || status.status === "connected" || status.status === "ready")) {
        console.debug("[CrmPexe WhatsApp]", "Poll status", { hasQr: !!status.qr, status: status.status });
      }
      setQrData(status);
      if (status.status === "connected" || status.status === "ready") {
        setPolling(false);
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", account.id] });
      }
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.warn("[CrmPexe WhatsApp]", "Erro no poll", err);
      }
      setPolling(false);
    }
  }, [account.id, queryClient, isNativeSession]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [polling, pollStatus]);

  const { data: sessions = [] } = useQuery({
    queryKey: ["whatsapp-sessions", account.id],
    queryFn: () => integrationsApi.listWhatsappSessions(account.id),
    enabled: secretsConfigured || mode === "native"
  });

  if (!secretsConfigured && mode === "choice") {
    return (
      <div className="space-y-4 mt-4 p-4 rounded-lg border bg-card">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Como conectar o WhatsApp
        </h3>
        <p className="text-xs text-muted-foreground">
          Escolha uma forma de criar a sessao. A <strong>sessao integrada</strong> gera o QR Code
          direto no sistema (como no app de computador), sem precisar de API externa.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("native")}
            className="flex flex-col items-start gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            <Smartphone className="w-6 h-6 text-primary" />
            <span className="font-medium text-sm">Sessao integrada (recomendado)</span>
            <span className="text-xs text-muted-foreground">
              QR Code gerado pelo proprio sistema. Nao precisa configurar URL nem token.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("api")}
            className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent/30"
          >
            <Shield className="w-6 h-6 text-muted-foreground" />
            <span className="font-medium text-sm">API externa (Evolution, etc.)</span>
            <span className="text-xs text-muted-foreground">
              Use sua propria API WhatsApp com URL e token.
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!secretsConfigured && mode === "api") {
    return (
      <div className="space-y-4 mt-4 p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-xs font-medium text-primary/80 uppercase tracking-wider">
          <span className="flex w-6 h-6 items-center justify-center rounded-full bg-primary/20">1</span>
          Passo 1 — Configurar API
        </div>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Configurar API do WhatsApp
        </h3>
        <p className="text-xs text-muted-foreground">
          Para conectar via API externa (Evolution ou compativel), configure a URL e o token abaixo.
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">URL da API</Label>
            <Input
              placeholder="https://sua-api-whatsapp.com"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Token da API</Label>
            <Input
              type="password"
              placeholder="Seu token de autenticacao"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => saveSecretsMutation.mutate()}
              disabled={saveSecretsMutation.isPending || !apiUrl.trim() || !apiToken.trim()}
            >
              {saveSecretsMutation.isPending ? "Salvando..." : "Salvar e ir para QR Code"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("choice")}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* QR Code section */}
      <div className="p-4 rounded-lg border bg-card space-y-4">
        <div className="flex items-center gap-2 text-xs font-medium text-primary/80 uppercase tracking-wider">
          <span className="flex w-6 h-6 items-center justify-center rounded-full bg-primary/20">2</span>
          Passo 2 — Conectar via QR Code
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Conectar WhatsApp via QR Code
              {isNativeSession && (
                <span className="text-xs font-normal text-muted-foreground">(sessao integrada)</span>
              )}
            </h3>
            {isNativeSession && (
              <Button size="sm" variant="ghost" onClick={() => setMode("choice")}>
                Voltar
              </Button>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => requestQrMutation.mutate(mode === "native")}
            disabled={requestQrMutation.isPending}
            className="gap-1"
          >
            {requestQrMutation.isPending ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Gerando...</>
            ) : (
              <><QrCode className="w-3 h-3" /> {isNativeSession ? "Gerar QR Code" : "Conectar via QR Code"}</>
            )}
          </Button>
        </div>

        {requestQrMutation.isError && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-destructive font-medium">Erro ao gerar QR Code</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {requestQrMutation.error instanceof Error
                    ? requestQrMutation.error.message
                    : "Erro desconhecido. Verifique a URL e o token da API."}
                </p>
              </div>
            </div>
          </div>
        )}

        {qrData?.needsSupport && (
          <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium">Configuracao necessaria</p>
                <p className="text-muted-foreground text-xs mt-1">{qrData.message}</p>
                {qrData.supportContactUrl && (
                  <a
                    href={qrData.supportContactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline mt-1 inline-block"
                  >
                    Entrar em contato com suporte
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {displayQr && !qrData?.needsSupport && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG
                value={displayQr}
                size={256}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium flex items-center gap-2 justify-center">
                <Smartphone className="w-4 h-4" />
                Escaneie com seu WhatsApp
              </p>
              <p className="text-xs text-muted-foreground">
                Abra o WhatsApp no celular → Menu (⋮) → Aparelhos conectados → Conectar aparelho
              </p>
              {polling && (
                <p className="text-xs text-primary flex items-center gap-1 justify-center mt-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Aguardando leitura do QR Code...
                </p>
              )}
            </div>
          </div>
        )}

        {qrData && !qrData.qr && !qrData.needsSupport && (
          <div className="text-center py-6">
            {qrData.status === "connected" || qrData.status === "ready" ? (
              <div className="space-y-2">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
                <p className="text-sm font-medium text-green-400">WhatsApp conectado!</p>
                <p className="text-xs text-muted-foreground">
                  Conexao salva no sistema. Seu WhatsApp esta pronto para receber e enviar mensagens.
                </p>
              </div>
            ) : qrData.status === "connection_failed" ? (
              <div className="space-y-3">
                <XCircle className="w-10 h-10 text-destructive mx-auto" />
                <p className="text-sm font-medium text-destructive">Falha na conexao</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Nao foi possivel conectar aos servidores do WhatsApp a partir do servidor onde a API esta rodando. A conexao usa sempre a rede e o IP do servidor (ex.: VPS), nunca do seu navegador.
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Em ambiente local (seu PC), redes domesticas ou corporativas costumam ser bloqueadas pelo WhatsApp. Rode a API em uma VPS e tente de novo ou use uma API externa (Evolution) abaixo.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => requestQrMutation.mutate(mode === "native")}>
                    Tentar novamente
                  </Button>
                  <Button size="sm" onClick={() => { setQrData(null); setMode("api"); }}>
                    Usar API externa (Evolution)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <RefreshCw className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Status: {qrData.status}
                </p>
                <Button size="sm" variant="outline" onClick={() => requestQrMutation.mutate(mode === "native")}>
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        )}

        {!qrData && !requestQrMutation.isPending && (
          <div className="text-center py-6 space-y-2">
            <QrCode className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground">
              Clique em &quot;Conectar via QR Code&quot; para gerar o QR e salvar a conexao no sistema.
            </p>
          </div>
        )}
      </div>

      {/* Sessions list */}
      {sessions.length > 0 && (
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <h3 className="font-semibold text-sm">Sessoes ativas</h3>
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                {session.status === "connected" || session.status === "ready" ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{session.sessionName}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.provider} · {session.status}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(session.updatedAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const { data: me } = useAuthMe();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<IntegrationType>("WHATSAPP");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [keysDialogType, setKeysDialogType] = useState<"OPENAI" | "N8N" | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: integrationsApi.listAccounts,
    enabled: !!me?.currentWorkspaceId
  });

  const createMutation = useMutation({
    mutationFn: () => integrationsApi.createAccount({
      name: newName.trim(),
      type: newType,
      status: "ACTIVE"
    }),
    onSuccess: (created) => {
      setShowCreateForm(false);
      setNewName("");
      setFeedback(`Integracao "${created.name}" criada com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      if (created.type === "WHATSAPP") {
        setExpandedId(created.id);
      }
    },
    onError: (err) => {
      setFeedback(err instanceof Error ? err.message : "Erro ao criar integracao.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.deleteAccount(id),
    onSuccess: () => {
      setFeedback("Integracao removida.");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    }
  });

  const whatsappAccounts = accounts.filter((a) => a.type === "WHATSAPP");
  const otherAccounts = accounts.filter((a) => a.type !== "WHATSAPP");

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Plug className="w-6 h-6" />
              Integracoes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte WhatsApp, IA e outros servicos ao seu workspace.
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Integracao
          </Button>
        </div>

        {feedback && (
          <div className="flex items-center gap-2 text-sm p-3 rounded-lg border border-primary/30 text-primary bg-primary/5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setKeysDialogType("OPENAI")}
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-left hover:bg-accent/30 transition-colors"
          >
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Bot className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="font-medium text-sm">OpenAI</p>
              <p className="text-xs text-muted-foreground">Chave de API para IA</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setKeysDialogType("N8N")}
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-left hover:bg-accent/30 transition-colors"
          >
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Workflow className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-sm">N8N</p>
              <p className="text-xs text-muted-foreground">Automações e workflows</p>
            </div>
          </button>
        </div>

        {keysDialogType && (
          <IntegrationKeysDialog
            type={keysDialogType}
            open={!!keysDialogType}
            onOpenChange={(open) => !open && setKeysDialogType(null)}
            onSuccess={() => {
              setFeedback("Integração configurada com sucesso.");
              queryClient.invalidateQueries({ queryKey: ["integrations"] });
            }}
          />
        )}

        {showCreateForm && (
          <div className="rounded-xl border p-4 space-y-4 bg-card">
            <h2 className="font-semibold">Adicionar nova integracao</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Meu WhatsApp Principal"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as IntegrationType)}
                >
                  {Object.entries(typeConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newName.trim()}
              >
                {createMutation.isPending ? "Criando..." : "Criar Integracao"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Carregando integracoes...</p>}

        {/* WhatsApp section */}
        <section className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-400" />
            WhatsApp ({whatsappAccounts.length})
          </h2>

          {whatsappAccounts.length === 0 && (
            <div className="text-center py-8 border rounded-xl">
              <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum WhatsApp conectado.</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  setNewType("WHATSAPP");
                  setNewName("Meu WhatsApp");
                  setShowCreateForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar WhatsApp
              </Button>
            </div>
          )}

          {whatsappAccounts.map((account) => (
            <div key={account.id} className="rounded-xl border overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === account.id ? null : account.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(expandedId === account.id ? null : account.id);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      {account.hasSecret && " · Configurado"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Remover "${account.name}"?`)) {
                        deleteMutation.mutate(account.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {expandedId === account.id && (
                <div className="px-4 pb-4 border-t">
                  <WhatsappQrPanel account={account} />
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Other integrations */}
        {otherAccounts.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Plug className="w-4 h-4" />
              Outras Integracoes ({otherAccounts.length})
            </h2>

            {otherAccounts.map((account) => {
              const cfg = typeConfig[account.type] ?? typeConfig.VOIP;
              const Icon = cfg.icon;
              return (
                <div key={account.id} className="rounded-xl border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cfg.label} · {account.status === "ACTIVE" ? "Ativo" : "Inativo"}
                        {account.hasSecret && " · Configurado"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Remover "${account.name}"?`)) {
                        deleteMutation.mutate(account.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </section>
        )}

        {accounts.length === 0 && !isLoading && !showCreateForm && (
          <div className="text-center py-16 border rounded-xl">
            <Plug className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma integracao configurada</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Adicione WhatsApp, IA ou outros servicos para comecar.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Integracao
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
