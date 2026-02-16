export interface DashboardData {
  totalConversas: number;
  conversasAtivas: number;
  vendasMes: number;
  taxaConversao: number;
  slaPrimeiraResposta: {
    tempoMedioSegundos: number;
  };
  conversaoEntreEtapas: FunnelStage[];
  produtividadeUsuarios: UserProductivity[];
  vendasPorDia: DailySales[];
  canais: ChannelData[];
  conversasRecentes: RecentConversation[];
}

export interface FunnelStage {
  etapa: string;
  quantidade: number;
  taxaConversao: number | null;
}

export interface UserProductivity {
  nome: string;
  conversasFechadas: number;
  mensagensEnviadas: number;
  taxaFechamento: number;
}

export interface DailySales {
  data: string;
  vendas: number;
  conversas: number;
}

export interface ChannelData {
  canal: string;
  percentual: number;
}

export interface RecentConversation {
  id: string | number;
  nomeContato: string;
  ultimaMensagem: string;
  canal: string;
  tempo: string;
  status: "active" | "waiting" | "resolved";
}
