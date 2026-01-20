import { Button } from "@/components/ui/button";
import { LogoutButton } from "./logout-button";

export default function DashboardPage() {
  // Dados simulados para o dashboard (substituir por chamadas de API reais futuramente)
  const stats = [
    {
      label: "Mensagens Enviadas",
      value: "12.450",
      change: "+12%",
      trend: "up",
      icon: (
        <svg
          className="h-6 w-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    {
      label: "Contatos Ativos",
      value: "3.200",
      change: "+5.4%",
      trend: "up",
      icon: (
        <svg
          className="h-6 w-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: "Campanhas Ativas",
      value: "8",
      change: "0%",
      trend: "neutral",
      icon: (
        <svg
          className="h-6 w-6 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
          />
        </svg>
      ),
    },
    {
      label: "Taxa de Entrega",
      value: "98.5%",
      change: "-1.2%",
      trend: "down",
      icon: (
        <svg
          className="h-6 w-6 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const recentActivity = [
    {
      id: 1,
      user: "João Silva",
      action: "Nova campanha criada",
      time: "2 horas atrás",
      status: "Sucesso",
    },
    {
      id: 2,
      user: "Maria Souza",
      action: "Importação de contatos",
      time: "4 horas atrás",
      status: "Processando",
    },
    {
      id: 3,
      user: "Sistema",
      action: "Backup automático",
      time: "6 horas atrás",
      status: "Sucesso",
    },
    {
      id: 4,
      user: "Carlos Oliveira",
      action: "Alteração de template",
      time: "1 dia atrás",
      status: "Pendente",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      {/* Topo do Dashboard */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">
          Painel de Controle
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline" size="sm">
            Ajuda
          </Button>
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            U
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Saudação e Ações Rápidas */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Bem-vindo de volta!
              </h2>
              <p className="text-gray-500">
                Aqui está o resumo da sua performance hoje.
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Nova Campanha
              </Button>
              <Button variant="outline">Importar Contatos</Button>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </span>
                  <div className="rounded-md bg-gray-50 p-2">{stat.icon}</div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      stat.trend === "up"
                        ? "text-green-600"
                        : stat.trend === "down"
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Seção Principal: Gráfico e Atividade Recente */}
          <div className="grid gap-4 md:grid-cols-7">
            {/* Área do Gráfico (Simulado) */}
            <div className="col-span-4 rounded-xl border bg-white shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Fluxo de Mensagens
                </h3>
                <p className="text-sm text-gray-500">Últimos 7 dias</p>
                <div className="mt-6 flex h-[300px] items-end justify-between gap-2 px-2">
                  {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                    <div key={i} className="group relative w-full">
                      <div
                        className="w-full rounded-t-md bg-blue-500 transition-all hover:bg-blue-600"
                        style={{ height: `${height}%` }}
                      ></div>
                      <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-400">
                        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista de Atividades Recentes */}
            <div className="col-span-3 rounded-xl border bg-white shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Atividade Recente
                </h3>
                <p className="text-sm text-gray-500">
                  Últimas ações no sistema
                </p>
              </div>
              <div className="border-t">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b p-4 last:border-0 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {item.user
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.action}
                        </p>
                        <p className="text-xs text-gray-500">{item.user}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{item.time}</p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.status === "Sucesso"
                            ? "bg-green-100 text-green-700"
                            : item.status === "Processando"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t bg-gray-50 rounded-b-xl">
                <Button variant="ghost" className="w-full text-sm">
                  Ver todo o histórico
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}