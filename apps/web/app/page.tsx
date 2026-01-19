import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Núcleo SaaS",
    items: [
      "Auth & Conta",
      "Workspaces/Tenants",
      "RBAC",
      "Licenças & Planos",
      "Auditoria & Logs"
    ]
  },
  {
    title: "CRM clássico",
    items: [
      "Contatos",
      "Empresas",
      "Negócios/Pipeline",
      "Tarefas/Atividades",
      "Tags/Custom Fields"
    ]
  },
  {
    title: "Atendimento",
    items: [
      "Inbox",
      "Conversas",
      "Mensagens",
      "Atribuição",
      "SLA",
      "Canais"
    ]
  },
  {
    title: "Integrações & Automação",
    items: [
      "Central de Integrações",
      "Templates de Automação",
      "Instalar Automação",
      "Execuções & Erros",
      "Webhooks"
    ]
  },
  {
    title: "Dashboards",
    items: ["KPI Atendimento", "KPI Comercial", "KPI Automação"]
  },
  {
    title: "IA",
    items: [
      "Resumo de conversa",
      "Classificação de lead",
      "Sugestão de resposta",
      "Extração para campos"
    ]
  },
  {
    title: "Admin",
    items: ["Super Admin", "Suporte/Impersonate", "Gestão de Templates"]
  }
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16">
      <section className="space-y-6">
        <div className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            CrmPexe
          </p>
          <h1 className="text-4xl font-semibold text-slate-100 md:text-5xl">
            Plataforma SaaS multi-tenant de CRM + Atendimento + Automações
          </h1>
          <p className="max-w-2xl text-base text-slate-300">
            Estrutura inicial de componentes e infraestrutura para evoluir módulos
            críticos de CRM e operações.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>Mapa de módulos</Button>
          <Button variant="outline">Roadmap técnico</Button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <div
            key={module.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-100">
              {module.title}
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {module.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
