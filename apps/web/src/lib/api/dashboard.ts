import { apiFetch } from "./client";
import type { DashboardData, FunnelStage, UserProductivity, DailySales } from "./types";

export type SalesDashboardResponse = {
  periodo: { inicio: string; fim: string; intervalo: string };
  dealsPorEtapa: { etapa: string; quantidade: number; valorTotal: number }[];
  conversaoEntreEtapas: {
    etapaOrigem: string;
    etapaDestino: string;
    quantidade: number;
    taxaConversao: number;
  }[];
  slaPrimeiraResposta: {
    conversasRespondidas: number;
    tempoMedioSegundos: number;
  };
  valorPorPeriodo: { periodo: string; total: number; quantidade: number }[];
  produtividadeUsuarios: UserProductivity[];
  rankingResponsaveis: { usuarioId: string; nome: string; quantidade: number; valorTotal: number }[];
};

export type AutomationDashboardResponse = {
  periodo: { inicio: string; fim: string; intervalo: string };
  execucoesPorPeriodo: { periodo: string; quantidade: number }[];
  taxaFalha: { total: number; falhas: number; percentual: number };
  templatesMaisUsados: { templateId: string; nome: string; quantidade: number }[];
  errosTop: { templateId: string; nome: string; falhas: number }[];
};

function mapSalesResponseToDashboardData(raw: SalesDashboardResponse): DashboardData {
  const vendasPorDia: DailySales[] = raw.valorPorPeriodo.map((p) => ({
    data: p.periodo,
    vendas: p.total,
    conversas: p.quantidade
  }));

  const conversaoEntreEtapas: FunnelStage[] = raw.conversaoEntreEtapas.map((c) => ({
    etapa: `${c.etapaOrigem} → ${c.etapaDestino}`,
    quantidade: c.quantidade,
    taxaConversao: c.taxaConversao
  }));

  const vendasMes = raw.valorPorPeriodo.reduce((acc, p) => acc + p.total, 0);
  const totalConversas = raw.slaPrimeiraResposta?.conversasRespondidas ?? 0;
  const taxaConversao =
    raw.produtividadeUsuarios.length > 0
      ? raw.produtividadeUsuarios.reduce((acc, u) => acc + u.taxaFechamento, 0) / raw.produtividadeUsuarios.length
      : 0;

  return {
    totalConversas,
    conversasAtivas: totalConversas,
    vendasMes,
    taxaConversao: Math.round(taxaConversao * 10) / 10,
    slaPrimeiraResposta: {
      tempoMedioSegundos: raw.slaPrimeiraResposta?.tempoMedioSegundos ?? 0
    },
    conversaoEntreEtapas,
    produtividadeUsuarios: raw.produtividadeUsuarios ?? [],
    vendasPorDia,
    canais: [],
    conversasRecentes: []
  };
}

export const dashboardApi = {
  getSales: async (): Promise<DashboardData> => {
    const raw = await apiFetch<SalesDashboardResponse>("/dashboard/sales");
    return mapSalesResponseToDashboardData(raw);
  },
  getAutomation: () => apiFetch<AutomationDashboardResponse>("/dashboard/automation")
};
