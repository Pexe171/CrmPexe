import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { ChannelDistribution } from "@/components/dashboard/ChannelDistribution";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { ProductivityTable } from "@/components/dashboard/ProductivityTable";
import { useDashboardData, useAutomationDashboardData } from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { MessageSquare, TrendingUp, Clock, Target, AlertCircle, ChevronDown, ChevronUp, Plug, Workflow } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/config";

const ONBOARDING_HIDDEN_KEY = "crmpexe_onboarding_hidden";

const WORKSPACE_UNDEFINED_MSG = "Workspace atual não definido";

const Index = () => {
  const navigate = useNavigate();
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [onboardingVisible, setOnboardingVisible] = useState(() => {
    try {
      return !JSON.parse(localStorage.getItem(ONBOARDING_HIDDEN_KEY) ?? "false");
    } catch {
      return true;
    }
  });
  const { data, isLoading, isError, error } = useDashboardData();
  const { data: automationData } = useAutomationDashboardData();
  const isWorkspaceError =
    isError &&
    error instanceof Error &&
    error.message.includes(WORKSPACE_UNDEFINED_MSG);

  useEffect(() => {
    if (isWorkspaceError) {
      navigate("/workspace-setup", { replace: true });
    }
  }, [isWorkspaceError, navigate]);

  const formatCurrency = (value?: number) => {
    if (value == null) return undefined;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value}`;
  };

  const formatSla = (seconds?: number) => {
    if (seconds == null) return undefined;
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}min`;
  };

  const hideOnboarding = () => {
    setOnboardingVisible(false);
    try {
      localStorage.setItem(ONBOARDING_HIDDEN_KEY, "true");
    } catch {}
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visão geral do seu atendimento
              {!onboardingVisible && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingVisible(true);
                      setOnboardingOpen(true);
                      try {
                        localStorage.removeItem(ONBOARDING_HIDDEN_KEY);
                      } catch {}
                    }}
                    className="text-primary hover:underline"
                  >
                    Ver primeiros passos
                  </button>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isError && !isWorkspaceError ? (
              <>
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-destructive">API offline</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
                <span className="text-xs text-muted-foreground">Online</span>
              </>
            )}
          </div>
        </div>

        {/* Connection error banner — não exibir para erro de workspace (redireciona) */}
        {isError && !isWorkspaceError && (
          <div className="glass-card rounded-xl p-4 border-destructive/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground font-medium">Não foi possível conectar à API</p>
              <p className="text-xs text-muted-foreground mt-1">
                Verifique se a API está rodando em <code className="text-primary">{API_BASE_URL}</code>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Erro: {error instanceof Error ? error.message : "Desconhecido"}
              </p>
            </div>
          </div>
        )}

        {/* Primeiros passos — passo a passo completo (visível ao entrar no CRM) */}
        {onboardingVisible && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOnboardingOpen((o) => !o)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plug className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Primeiros passos — como usar o CRM</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    hideOnboarding();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Ocultar
                </Button>
                {onboardingOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {onboardingOpen && (
              <div className="border-t px-4 pb-4 pt-2 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tudo é feito pelo painel. Siga os passos abaixo; você pode voltar aqui pelo menu <strong>Dashboard</strong>.
                </p>

                <ol className="space-y-4 list-none pl-0">
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">1</span>
                    <div>
                      <p className="font-medium text-foreground">Conectar WhatsApp</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Vá em <strong>Integrações</strong> (menu) → crie uma integração <strong>WhatsApp</strong> → escolha <strong>API externa (Evolution)</strong>. No Passo 1 informe a <strong>URL da Evolution</strong> e o <strong>Token</strong> (quem instalou a Evolution te passa). No Passo 2: use <strong>Conectar via QR Code (Gratuito)</strong> — clique em Gerar QR Code, escaneie com o celular (WhatsApp → Aparelhos conectados) — ou <strong>Conectar via API Oficial (Meta)</strong> — preencha Token e ID do número da Meta e clique em Conectar. Não é preciso usar Postman; tudo no painel.
                      </p>
                      <Button asChild size="sm" className="mt-2">
                        <Link to="/integrations">Abrir Integrações e conectar WhatsApp</Link>
                      </Button>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">2</span>
                    <div>
                      <p className="font-medium text-foreground">Ver e responder conversas</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Depois de conectar o WhatsApp, as conversas aparecem em <strong>Conversas</strong> (menu). Clique em uma conversa para abrir o chat e enviar mensagens em tempo real.
                      </p>
                      <Button asChild size="sm" variant="outline" className="mt-2">
                        <Link to="/conversations">Abrir Conversas</Link>
                      </Button>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">3</span>
                    <div>
                      <p className="font-medium text-foreground">Pipeline de vendas</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Em <strong>Pipeline</strong> você vê os negócios (Leads, Qualificação, Proposta, Negociação, Fechado). Arraste os cards entre colunas para mudar o estágio.
                      </p>
                      <Button asChild size="sm" variant="outline" className="mt-2">
                        <Link to="/sales">Abrir Pipeline</Link>
                      </Button>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">4</span>
                    <div>
                      <p className="font-medium text-foreground">OpenAI e N8N (opcional)</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Em <strong>Integrações</strong> você também configura OpenAI (API Key) e N8N (URL + API Key) para automações e IA. Em <strong>Automações → Fluxo</strong> monta bots visuais.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Conversas Ativas"
            value={data?.conversasAtivas?.toString()}
            icon={MessageSquare}
            delay={0}
            isLoading={isLoading}
          />
          <KpiCard
            title="Vendas do Mês"
            value={formatCurrency(data?.vendasMes)}
            icon={TrendingUp}
            delay={50}
            isLoading={isLoading}
          />
          <KpiCard
            title="SLA Resposta"
            value={formatSla(data?.slaPrimeiraResposta?.tempoMedioSegundos)}
            icon={Clock}
            delay={100}
            isLoading={isLoading}
          />
          <KpiCard
            title="Taxa de Conversão"
            value={data?.taxaConversao != null ? `${data.taxaConversao}%` : undefined}
            icon={Target}
            delay={150}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SalesChart data={data?.vendasPorDia} isLoading={isLoading} />
          </div>
          <ChannelDistribution data={data?.canais} isLoading={isLoading} />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentConversations data={data?.conversasRecentes} isLoading={isLoading} />
          </div>
          <ConversionFunnel data={data?.conversaoEntreEtapas} isLoading={isLoading} />
        </div>

        {/* Productivity */}
        <ProductivityTable data={data?.produtividadeUsuarios} isLoading={isLoading} />

        {/* Automation dashboard */}
        {automationData && (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-1">
              <Workflow className="w-5 h-5 text-primary" />
              Automações
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Execuções e taxa de falha no período</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Execuções</p>
                <p className="text-2xl font-semibold mt-1">{automationData.taxaFalha.total}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Falhas</p>
                <p className="text-2xl font-semibold mt-1 text-destructive">{automationData.taxaFalha.falhas}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Taxa de falha</p>
                <p className="text-2xl font-semibold mt-1">{automationData.taxaFalha.percentual.toFixed(1)}%</p>
              </div>
            </div>
            {automationData.templatesMaisUsados?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Templates mais usados</p>
                <ul className="space-y-1 text-sm">
                  {automationData.templatesMaisUsados.slice(0, 5).map((t) => (
                    <li key={t.templateId} className="flex justify-between">
                      <span className="truncate">{t.nome || t.templateId}</span>
                      <span className="text-muted-foreground">{t.quantidade}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
