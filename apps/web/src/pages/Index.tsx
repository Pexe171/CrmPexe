import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { ChannelDistribution } from "@/components/dashboard/ChannelDistribution";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { ProductivityTable } from "@/components/dashboard/ProductivityTable";
import { useDashboardData } from "@/hooks/useDashboardData";
import { MessageSquare, TrendingUp, Clock, Target, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/config";

const Index = () => {
  const { data, isLoading, isError, error } = useDashboardData();

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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visão geral do seu atendimento
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isError ? (
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

        {/* Connection error banner */}
        {isError && (
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
      </div>
    </DashboardLayout>
  );
};

export default Index;
