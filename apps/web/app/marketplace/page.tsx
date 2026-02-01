import Link from "next/link";

import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const whatsappLink =
  process.env.NEXT_PUBLIC_WHATSAPP_LINK || "https://wa.me/5511999999999";

type MarketplaceAgent = {
  id: string;
  name: string;
  headline?: string;
  description: string;
  status?: "PENDING" | "APPROVED";
};

type MarketplaceData = {
  agents: MarketplaceAgent[];
};

const fallbackData: MarketplaceData = {
  agents: []
};

const statusLabels = {
  PENDING: "Em análise interna",
  APPROVED: "Liberado para contratação"
} as const;

const statusStyles = {
  PENDING: "bg-amber-500/15 text-amber-200",
  APPROVED: "bg-emerald-500/15 text-emerald-200"
} as const;

const getMarketplaceData = async (): Promise<MarketplaceData> => {
  try {
    const agentsResponse = await fetch(`${apiUrl}/api/marketplace/agents`, { cache: "no-store" });

    if (!agentsResponse.ok) {
      return fallbackData;
    }

    const agents = (await agentsResponse.json()) as MarketplaceAgent[];
    return { agents };
  } catch {
    return fallbackData;
  }
};

export default async function MarketplacePage() {
  const { agents } = await getMarketplaceData();
  const hasAgents = agents.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/60 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
              Agentes CrmPexe
            </p>
            <h1 className="text-2xl font-semibold text-slate-100">
              Catálogo de agentes para o seu CRM
            </h1>
          </div>
          <div />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              Fluxo de contratação
            </p>
            <h2 className="text-3xl font-semibold text-white">
              Você escolhe, o super admin libera
            </h2>
            <p className="text-sm text-slate-300">
              A contratação acontece diretamente com nosso time. Se você deseja um agente, clique em{" "}
              <strong>Contactar no WhatsApp</strong>. O super admin localiza seu usuário pelo e-mail,
              nome ou login e libera o agente para o workspace conforme a necessidade.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={whatsappLink} target="_blank" rel="noreferrer">
                <Button className="min-w-[220px]">Contactar no WhatsApp</Button>
              </Link>
              <Button
                className="min-w-[220px] bg-slate-800 text-slate-100 hover:bg-slate-700"
                variant="outline"
              >
                Ver documentação de agentes
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/30 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              Como funciona
            </p>
            <ol className="space-y-4 text-sm text-slate-300">
              <li className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">1. Solicite pelo WhatsApp</p>
                <p className="mt-2">
                  Nosso time entende sua necessidade e define o agente ideal para o seu CRM.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">2. Configuração técnica</p>
                <p className="mt-2">
                  O admin cadastra o agente, descreve o que ele faz e informa o ping e o JSON de
                  configuração.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-white">3. Aprovação</p>
                <p className="mt-2">
                  Você acompanha o status <strong>Pendente</strong> ou <strong>Aprovado</strong> direto
                  aqui no painel.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Agentes disponíveis
              </p>
              <h3 className="text-3xl font-semibold text-white">
                Acompanhe a liberação do seu agente
              </h3>
            </div>
            <Link href={whatsappLink} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-200">
              Preciso de um agente →
            </Link>
          </div>

          {!hasAgents ? (
            <div className="mt-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8">
              <p className="text-sm text-slate-300">
                Ainda não há agentes disponíveis no catálogo. Fale com nosso time para iniciar a
                contratação.
              </p>
              <div className="mt-4">
                <Link href={whatsappLink} target="_blank" rel="noreferrer">
                  <Button>Contactar no WhatsApp</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {agents.map((agent) => (
                <article
                  key={agent.id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-semibold text-white">{agent.name}</h4>
                      {agent.status ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                            statusStyles[agent.status]
                          }`}
                        >
                          {statusLabels[agent.status]}
                        </span>
                      ) : null}
                    </div>
                    {agent.headline ? (
                      <p className="text-sm font-semibold text-emerald-200">{agent.headline}</p>
                    ) : null}
                    <p className="text-sm text-slate-300">{agent.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={whatsappLink} target="_blank" rel="noreferrer">
                      <Button>Solicitar este agente</Button>
                    </Link>
                    <Button
                      className="bg-slate-800 text-slate-100 hover:bg-slate-700"
                      variant="outline"
                    >
                      Detalhes em breve
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Atendimento dedicado
              </p>
              <h3 className="text-3xl font-semibold text-white">Administração centralizada</h3>
              <p className="text-sm text-slate-300">
                Para garantir segurança e configuração correta, o super admin não acessa o perfil do
                cliente. Ele localiza seu usuário pelo e-mail, login ou nome cadastrado e libera o
                agente diretamente no painel do super admin, sempre por workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Fale com nosso time para acelerar a aprovação.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
