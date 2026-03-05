import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationsApi } from "@/lib/api/integrations";
import type { IntegrationAccount, WhatsappQrResponse } from "@/lib/api/integrations";
import { ApiError } from "@/lib/api/client";
import { IntegrationKeysDialog } from "@/components/integrations/IntegrationKeysDialog";
import { useWhatsappSocketStore } from "@/stores/whatsapp-socket";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plug, MessageSquare, Plus, Trash2, QrCode, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Loader2, Smartphone,
  Shield, Wifi, WifiOff, Bot, Workflow, BookOpen, ChevronRight
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
  const [metaToken, setMetaToken] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");

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
      provider: "EVOLUTION"
    }),
    onSuccess: () => {
      setSecretsConfigured(true);
      setMode("api");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    }
  });

  const createEvolutionQrMutation = useMutation({
    mutationFn: () =>
      integrationsApi.createEvolutionInstance(account.id, { type: "QR" }),
    onSuccess: (data) => {
      setQrData(data);
      if (data.status !== "connected" && data.status !== "ready") setPolling(true);
      if (data.status === "connected" || data.status === "ready") {
        setPolling(false);
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", account.id] });
      }
      if (data.qr) {
        toast.success("QR Code gerado. Escaneie no WhatsApp.");
      }
    }
  });

  const connectEvolutionMutation = useMutation({
    mutationFn: () => integrationsApi.connectEvolution(account.id),
    onSuccess: (data) => {
      setQrData(data);
      if (data.status !== "connected" && data.status !== "ready") setPolling(true);
      if (data.status === "connected" || data.status === "ready") {
        setPolling(false);
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", account.id] });
      }
    }
  });

  const createEvolutionOfficialMutation = useMutation({
    mutationFn: () =>
      integrationsApi.createEvolutionInstance(account.id, {
        type: "OFFICIAL",
        metaToken: metaToken.trim(),
        metaPhoneNumberId: metaPhoneNumberId.trim()
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", account.id] });
      toast.success(data.message ?? "Instância oficial (Meta) criada.");
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
      if (data.status !== "connection_failed") {
        const retorno = {
          status: data.status,
          qr: data.qr ? "presente" : null,
          message: data.message ?? null,
          needsSupport: data.needsSupport ?? null
        };
        toast.info("Retorno recebido da API", {
          description: JSON.stringify(retorno, null, 2),
          duration: data.status === "connecting" ? 14000 : 8000
        });
      }
    },
    onError: (err) => {
      const status = err instanceof ApiError ? err.status : null;
      const message = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : String(err));
      const details = err instanceof ApiError ? err.details : null;
      const description = [
        status != null && `HTTP ${status}`,
        message,
        details && `Resposta bruta: ${details}`
      ]
        .filter(Boolean)
        .join("\n");
      toast.error("Erro ao gerar QR Code", { description, duration: 12000 });
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

  useEffect(() => {
    if (qrData?.status === "connection_failed") {
      const retorno = {
        status: qrData.status,
        qr: qrData.qr ? "presente" : null,
        message: qrData.message ?? null
      };
      toast.error("Retorno da API (connection_failed)", {
        description: JSON.stringify(retorno, null, 2),
        duration: 12000
      });
    }
  }, [qrData?.status, qrData?.message, qrData?.qr]);

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
          O WhatsApp costuma bloquear IPs de servidores (incl. VPS). Para maior estabilidade, use
          <strong> API externa (Evolution)</strong>. A sessão integrada pode falhar mesmo na VPS.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("api")}
            className="flex flex-col items-start gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-medium text-sm">API externa (Evolution) — recomendado</span>
            <span className="text-xs text-muted-foreground">
              URL + token da sua Evolution (ou API compativel). Funciona em VPS e evita bloqueios.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("native")}
            className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent/30"
          >
            <Smartphone className="w-6 h-6 text-muted-foreground" />
            <span className="font-medium text-sm">Sessão integrada (QR no próprio servidor)</span>
            <span className="text-xs text-muted-foreground">
              QR gerado pela API. Muitas vezes falha (WhatsApp bloqueia IP de servidor/VPS).
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
          Evolution API (ou compativel) evita bloqueios do WhatsApp. Instale em Docker ou use um provedor; depois informe URL e token abaixo.
        </p>

        <Collapsible className="group rounded-lg border border-border bg-muted/30">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/50 transition-colors">
            <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            Como obter a URL e o Token? (tutorial)
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 pt-0 text-xs text-muted-foreground space-y-3 border-t border-border mt-0 pt-3">
              <div>
                <p className="font-medium text-foreground mb-1">Se alguém instalou a Evolution para você (provedor/suporte)</p>
                <p>Peça a <strong>URL</strong> (ex: <code className="bg-muted px-1 rounded">https://evolution.empresa.com</code>) e o <strong>Token</strong> (chave de API). Eles te passam e você cola nos campos abaixo.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Se você mesmo instala (Docker / servidor)</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-1">
                  <li>Instale a Evolution API (ex: repositório oficial no GitHub — busque por &quot;Evolution API&quot;).</li>
                  <li>Configure a variável <strong>API_KEY</strong> (ou apikey) no ambiente — esse valor é o <strong>Token</strong> que você usa aqui.</li>
                  <li>A <strong>URL</strong> é o endereço onde a API está rodando (ex: <code className="bg-muted px-1 rounded">http://seu-servidor:8080</code> ou <code className="bg-muted px-1 rounded">https://evolution.seudominio.com</code>).</li>
                  <li>Depois de subir o serviço, use essa URL e o Token nos campos abaixo.</li>
                </ol>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

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
              {saveSecretsMutation.isPending ? "Salvando..." : "Salvar e continuar"}
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
          {mode === "api"
            ? "Passo 2 — Conectar (QR gratuito ou API Oficial Meta)"
            : "Passo 2 — Conectar via QR Code"}
        </div>

        {mode === "api" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                Conectar via QR Code (Gratuito)
              </h3>
              <p className="text-xs text-muted-foreground">
                Cria instância Baileys no Evolution e gera o QR para escanear.
              </p>
              <Button
                size="sm"
                onClick={() => createEvolutionQrMutation.mutate()}
                disabled={createEvolutionQrMutation.isPending}
                className="gap-1"
              >
                {createEvolutionQrMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Gerando...</>
                ) : (
                  <><QrCode className="w-3 h-3" /> Gerar QR Code</>
                )}
              </Button>
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Conectar via API Oficial (Meta)
              </h3>
              <p className="text-xs text-muted-foreground">
                Token e Phone ID do painel de desenvolvedores da Meta.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Token da Meta</Label>
                <Input
                  type="password"
                  placeholder="EAAL..."
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ID do número de telefone</Label>
                <Input
                  placeholder="1234567890"
                  value={metaPhoneNumberId}
                  onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button
                size="sm"
                onClick={() => createEvolutionOfficialMutation.mutate()}
                disabled={
                  createEvolutionOfficialMutation.isPending ||
                  !metaToken.trim() ||
                  !metaPhoneNumberId.trim()
                }
              >
                {createEvolutionOfficialMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Conectando...</>
                ) : (
                  "Conectar via API Oficial"
                )}
              </Button>
            </div>
          </div>
        )}

        {mode !== "api" && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Conectar WhatsApp via QR Code
                {isNativeSession && (
                  <span className="text-xs font-normal text-muted-foreground">(sessão integrada)</span>
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
              onClick={() => requestQrMutation.mutate(true)}
              disabled={requestQrMutation.isPending}
              className="gap-1"
            >
              {requestQrMutation.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Gerando...</>
              ) : (
                <><QrCode className="w-3 h-3" /> Gerar QR Code</>
              )}
            </Button>
          </div>
        )}

        {mode === "api" && (createEvolutionQrMutation.isError || connectEvolutionMutation.isError) && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-destructive font-medium">Erro Evolution</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {(createEvolutionQrMutation.error ?? connectEvolutionMutation.error) instanceof Error
                    ? (createEvolutionQrMutation.error ?? connectEvolutionMutation.error).message
                    : "Verifique a URL e o token da Evolution."}
                </p>
              </div>
            </div>
          </div>
        )}

        {mode === "native" && requestQrMutation.isError && (
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
                <p className="text-yellow-400 font-medium">Configuração necessária</p>
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
                  Conexão salva no sistema. Seu WhatsApp esta pronto para receber e enviar mensagens.
                </p>
              </div>
            ) : qrData.status === "connection_failed" ? (
              <div className="space-y-3">
                <XCircle className="w-10 h-10 text-destructive mx-auto" />
                <p className="text-sm font-medium text-destructive">Falha na conexão</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      mode === "api"
                        ? connectEvolutionMutation.mutate()
                        : requestQrMutation.mutate(true)
                    }
                  >
                    Tentar novamente
                  </Button>
                  <Button size="sm" onClick={() => { setQrData(null); setMode("api"); }}>
                    Usar API externa (Evolution)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <RefreshCw className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Status: {qrData.status}
                </p>
                {qrData.status === "connecting" && (
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    O WhatsApp costuma bloquear IP de servidor (incl. VPS). Use &quot;API externa (Evolution)&quot; para conexão estável.
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mode === "api"
                      ? connectEvolutionMutation.mutate()
                      : requestQrMutation.mutate(true)
                  }
                >
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        )}

        {!qrData &&
          !requestQrMutation.isPending &&
          !createEvolutionQrMutation.isPending &&
          !connectEvolutionMutation.isPending && (
          <div className="text-center py-6 space-y-2">
            <QrCode className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground">
              {mode === "api"
                ? "Use &quot;Conectar via QR Code (Gratuito)&quot; ou &quot;Conectar via API Oficial&quot; acima."
                : "Clique em &quot;Gerar QR Code&quot; para gerar o QR e salvar a conexão no sistema."}
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
      setFeedback(`Integração "${created.name}" criada com sucesso.`);
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
      setFeedback("Integração removida.");
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
              Integrações
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte WhatsApp, IA e outros servicos ao seu workspace.
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Integração
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
            <h2 className="font-semibold">Adicionar nova integração</h2>

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
                {createMutation.isPending ? "Criando..." : "Criar Integração"}
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
              Outras Integrações ({otherAccounts.length})
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
            <p className="text-lg font-medium text-muted-foreground">Nenhuma integração configurada</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Adicione WhatsApp, IA ou outros servicos para comecar.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Integração
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
