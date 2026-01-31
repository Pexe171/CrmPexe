import Link from "next/link";

import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type MarketplaceSummary = {
  headline: string;
  activeAgents: number;
  automationsAvailable: number;
  averageNps: number;
  satisfactionRate: number;
  lastUpdatedAt: string;
};

type MarketplaceCategory = {
  id: string;
  name: string;
  description: string;
  agentsCount: number;
  highlights: string[];
};

type MarketplaceAgent = {
  id: string;
  name: string;
  headline: string;
  description: string;
  categoryId: string;
  tags: string[];
  rating: number;
  installs: number;
  responseSlaSeconds: number;
  priceLabel: string;
  status: "AVAILABLE" | "COMING_SOON";
};

type MarketplaceData = {
  summary: MarketplaceSummary;
  categories: MarketplaceCategory[];
  agents: MarketplaceAgent[];
};

const fallbackData: MarketplaceData = {
  summary: {
    headline: "Marketplace de agentes especialistas para cada etapa do seu CRM.",
    activeAgents: 5,
    automationsAvailable: 42,
    averageNps: 68,
    satisfactionRate: 0.93,
    lastUpdatedAt: new Date().toISOString()
  },
  categories: [
    {
      id: "atendimento",
      name: "Atendimento inteligente",
      description: "Bots e agentes que resolvem tickets, triagem e follow-up com SLA otimizado.",
      agentsCount: 18,
      highlights: ["SLA em 30s", "Fila omnichannel", "LGPD by design"]
    },
    {
      id: "vendas",
      name: "Vendas e expansão",
      description: "Agentes focados em qualificação, pipeline e automação de propostas.",
      agentsCount: 12,
      highlights: ["Lead scoring", "Resumo de calls", "Playbooks dinâmicos"]
    },
    {
      id: "sucesso",
      name: "Customer Success",
      description: "Monitoramento de saúde, onboarding e planos de sucesso personalizados.",
      agentsCount: 9,
      highlights: ["Alertas proativos", "NPS em tempo real", "Planos de ação"]
    },
    {
      id: "operacoes",
      name: "Operações",
      description: "Orquestração de times, compliance e governança de dados.",
      agentsCount: 7,
      highlights: ["Auditoria contínua", "Permissões ABAC", "Relatórios LGPD"]
    }
  ],
  agents: [
    {
      id: "agent-exemplo",
      name: "Agent Atlas",
      headline: "Exemplo de agente pronto para ser editado pelo super admin.",
      description:
        "Esse agente é um modelo inicial. Altere o preço, a descrição e os detalhes pelo painel de super admin.",
      categoryId: "atendimento",
      tags: ["Exemplo", "Marketplace"],
      rating: 4.9,
      installs: 0,
      responseSlaSeconds: 45,
      priceLabel: "R$ 0,00",
      status: "AVAILABLE"
    }
  ]
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatSla = (seconds: number) => {
  if (seconds <= 60) return `Até ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `Até ${minutes} min`;
};

const getMarketplaceData = async (): Promise<MarketplaceData> => {
  try {
    const [summaryResponse, categoriesResponse, agentsResponse] = await Promise.all([
      fetch(`${apiUrl}/api/marketplace/summary`, { cache: "no-store" }),
      fetch(`${apiUrl}/api/marketplace/categories`, { cache: "no-store" }),
      fetch(`${apiUrl}/api/marketplace/agents`, { cache: "no-store" })
    ]);

    if (!summaryResponse.ok || !categoriesResponse.ok || !agentsResponse.ok) {
      return fallbackData;
    }

    const [summary, categories, agents] = await Promise.all([
      summaryResponse.json() as Promise<MarketplaceSummary>,
      categoriesResponse.json() as Promise<MarketplaceCategory[]>,
      agentsResponse.json() as Promise<MarketplaceAgent[]>
    ]);

    return { summary, categories, agents };
  } catch {
    return fallbackData;
  }
};

export default async function MarketplacePage() {
  const { summary, categories, agents } = await getMarketplaceData();
  const featuredAgents = agents.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/60 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              CrmPexe AI Marketplace
            </p>
            <h1 className="text-2xl font-semibold text-slate-100">
              Seus agentes de IA prontos para escalar o CRM
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="text-sm font-medium text-slate-300 transition hover:text-white"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="text-sm font-medium text-slate-300 transition hover:text-white"
              href="/login"
            >
              Login
            </Link>
            <Link href="/register">
              <Button>Começar agora</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">
              Marketplace oficial de agentes
            </div>
            <h2 className="text-4xl font-semibold leading-tight text-white">
              {summary.headline}
            </h2>
            <p className="text-lg text-slate-300">
              Publique, instale e monitore agentes com governança de dados, observabilidade e SLA de
              resposta em tempo real. Tudo pronto para o seu time de atendimento, vendas e sucesso.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button className="min-w-[180px]">Explorar agentes</Button>
              <Button className="min-w-[180px] bg-slate-800 text-slate-100 hover:bg-slate-700">
                Ver planos
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 text-sm text-slate-300 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                <p className="text-2xl font-semibold text-white">{summary.activeAgents}+</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">Agentes ativos</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                <p className="text-2xl font-semibold text-white">{summary.automationsAvailable}</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">Automações</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                <p className="text-2xl font-semibold text-white">{summary.averageNps}</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">NPS médio</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                <p className="text-2xl font-semibold text-white">
                  {formatPercent(summary.satisfactionRate)}
                </p>
                <p className="text-xs uppercase tracking-wider text-slate-400">Satisfação</p>
              </div>
            </div>
          </div>
          <div className="space-y-6 rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/30 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              Radar de performance
            </p>
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm uppercase tracking-widest text-emerald-200">SLA médio</p>
                <p className="text-2xl font-semibold text-white">35s</p>
                <p className="text-sm text-emerald-100">+12% melhor que o último mês</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-sm uppercase tracking-widest text-slate-300">Automação ativa</p>
                <p className="text-2xl font-semibold text-white">128 fluxos</p>
                <p className="text-sm text-slate-400">Cobertura omnichannel em 9 canais</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-sm uppercase tracking-widest text-slate-300">Resumo IA</p>
                <p className="text-sm text-slate-300">
                  Os agentes de atendimento reduziram 41% do backlog, com 93% de satisfação.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-300">
              Última atualização {new Intl.DateTimeFormat("pt-BR").format(new Date(summary.lastUpdatedAt))}
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Destaques do marketplace
              </p>
              <h3 className="text-3xl font-semibold text-white">Agentes prontos para ativar hoje</h3>
            </div>
            <Link href="/register" className="text-sm font-semibold text-emerald-200">
              Publicar um agente →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {featuredAgents.map((agent) => (
              <article
                key={agent.id}
                className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-semibold text-white">{agent.name}</h4>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                        agent.status === "AVAILABLE"
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "bg-amber-500/15 text-amber-200"
                      }`}
                    >
                      {agent.status === "AVAILABLE" ? "Disponível" : "Em breve"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-emerald-200">{agent.headline}</p>
                  <p className="text-sm text-slate-300">{agent.description}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {agent.tags.map((tag) => (
                      <span
                        key={`${agent.id}-${tag}`}
                        className="rounded-full border border-slate-700/80 px-3 py-1 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">Instalações</p>
                      <p className="text-base font-semibold text-white">{agent.installs}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">SLA</p>
                      <p className="text-base font-semibold text-white">
                        {formatSla(agent.responseSlaSeconds)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">Avaliação</p>
                      <p className="text-base font-semibold text-white">{agent.rating.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">Preço</p>
                      <p className="text-base font-semibold text-white">{agent.priceLabel}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              Categorias estratégicas
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-white">Mapeie todas as frentes do CRM</h3>
            <p className="mt-4 text-sm text-slate-300">
              Combine agentes especialistas com times humanos para garantir governança, produtividade e
              crescimento sustentável.
            </p>
            <div className="mt-6 space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-white">{category.name}</h4>
                    <span className="text-sm font-semibold text-emerald-200">
                      {category.agentsCount} agentes
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{category.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {category.highlights.map((highlight) => (
                      <span
                        key={`${category.id}-${highlight}`}
                        className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-200"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-slate-950/40 p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Como funciona
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-white">
                O fluxo completo do marketplace
              </h3>
            </div>
            <ol className="space-y-4 text-sm text-slate-300">
              <li className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">1. Descubra agentes</p>
                <p className="mt-2">
                  Filtre por categoria, compare SLA, custo e avaliações para montar sua stack.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">2. Instale com governança</p>
                <p className="mt-2">
                  Permissões, tokens e políticas LGPD são aplicadas automaticamente durante a ativação.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">3. Monitore resultados</p>
                <p className="mt-2">
                  Painéis em tempo real mostram SLA, custo por interação e impacto no NPS.
                </p>
              </li>
            </ol>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Precisa de um agente exclusivo? Publique sua solução e monetize no marketplace.
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Como o CRM marketplace funciona
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-white">
                O CRM já é o marketplace — comprar, ativar e operar em um só lugar
              </h3>
              <p className="mt-4 text-sm text-slate-300">
                No CrmPexe, o CRM é o centro do marketplace. O super admin publica agentes, define
                preço, descrição e SLA. Os workspaces escolhem o que instalar, acompanham resultados
                e usam os agentes no dia a dia sem sair do painel.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Você controla o catálogo, o preço e o posicionamento dos agentes.
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Publicação",
                description:
                  "O super admin cadastra agentes com preço, categoria, SLA, tags e descrição detalhada."
              },
              {
                title: "Compra dentro do CRM",
                description:
                  "Os clientes acessam o marketplace no CRM, comparam opções e ativam o agente com 1 clique."
              },
              {
                title: "Operação e governança",
                description:
                  "Painéis mostram impacto no atendimento, automações e ROI com governança completa."
              }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Integrações críticas
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-white">
                Conecte IA, canais e billing em um único hub
              </h3>
              <p className="mt-4 max-w-2xl text-sm text-slate-300">
                O marketplace trabalha com filas omnichannel, engine de automação, billing e
                observabilidade de agentes. Todas as integrações são auditadas e prontas para produção.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-300">
              + 24 integrações nativas
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "WhatsApp Cloud API",
              "Email transacional",
              "Voice + transcrição",
              "n8n + automações",
              "Mercado Pago",
              "Webhooks internos"
            ].map((integration) => (
              <div
                key={integration}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-200"
              >
                {integration}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-slate-800/80 bg-gradient-to-r from-emerald-500/10 via-slate-900/50 to-slate-950/60 p-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Pronto para ativar agora
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-white">
                Monte seu marketplace interno com governança total
              </h3>
              <p className="mt-3 text-sm text-slate-300">
                Crie espaços de trabalho, conecte canais e acelere sua operação com agentes de IA.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button className="min-w-[180px]">Criar workspace</Button>
              </Link>
              <Link href="/login">
                <Button className="min-w-[180px] bg-slate-800 text-slate-100 hover:bg-slate-700">
                  Acessar painel
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
