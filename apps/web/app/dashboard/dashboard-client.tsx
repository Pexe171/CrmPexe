"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { UserRole } from "@/lib/rbac";
import { LogoutButton } from "./logout-button";
import { TaskOverview } from "./task-overview";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Conversation = {
  id: string;
  status?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  contact?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  _count?: {
    messages?: number | null;
  } | null;
};

type AutomationInstance = {
  id: string;
  status: string;
  createdAt: string;
};

type AutomationInstancesMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

type AutomationInstancesResponse = {
  data: AutomationInstance[];
  meta: AutomationInstancesMeta;
};

type Workspace = {
  id: string;
  name: string;
  createdAt: string;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  userId: string;
};

type WorkspaceResponse = {
  currentWorkspaceId: string | null;
  workspaces: Workspace[];
};

type DashboardClientProps = {
  role: UserRole;
  isSuperAdmin: boolean;
};

const actionLabels: Record<string, string> = {
  CREATE: "Criou",
  UPDATE: "Atualizou",
  DELETE: "Removeu",
  USER_LOGIN: "Login",
  USER_LOGOUT: "Logout",
  WORKSPACE_CREATED: "Workspace criado",
  WORKSPACE_UPDATED: "Workspace atualizado",
  ROLE_ASSIGNED: "Papel atribuído",
  ROLE_REVOKED: "Papel removido"
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
};

const formatDayLabel = (date: Date) => {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(date)
    .replace(".", "")
    .replace(/^./, (value) => value.toUpperCase());
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "-";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
};

export default function DashboardClient({ role, isSuperAdmin }: DashboardClientProps) {
  const isAdmin = role === "ADMIN";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [instancesCount, setInstancesCount] = useState(0);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const auditScopeQuery = isAdmin ? "&scope=global" : "";
        const [conversationsResponse, instancesResponse, workspacesResponse, auditResponse] = await Promise.all([
          fetch(`${apiUrl}/api/conversations`, { credentials: "include" }),
          fetch(`${apiUrl}/api/automation-instances?page=1&perPage=1`, { credentials: "include" }),
          fetch(`${apiUrl}/api/workspaces`, { credentials: "include" }),
          fetch(`${apiUrl}/api/audit-logs?perPage=20${auditScopeQuery}`, {
            credentials: "include"
          })
        ]);

        if (!conversationsResponse.ok) {
          throw new Error("Não foi possível carregar as conversas.");
        }
        if (!instancesResponse.ok) {
          throw new Error("Não foi possível carregar as automações.");
        }
        if (!workspacesResponse.ok) {
          throw new Error("Não foi possível carregar os workspaces.");
        }
        if (!auditResponse.ok) {
          throw new Error("Não foi possível carregar o histórico.");
        }

        const [conversationsData, instancesData, workspacesData, auditData] = await Promise.all([
          (conversationsResponse.json() as Promise<Conversation[]>),
          (instancesResponse.json() as Promise<AutomationInstancesResponse>),
          (workspacesResponse.json() as Promise<WorkspaceResponse>),
          (auditResponse.json() as Promise<{ data: AuditLog[] }>),
        ]);

        setConversations(conversationsData);
        setInstancesCount(instancesData.meta.total);
        setWorkspaces(workspacesData.workspaces);
        setAuditLogs(auditData.data ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar o dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [isAdmin]);

  const stats = useMemo(() => {
    const messageCount = conversations.reduce((total, conversation) => {
      return total + (conversation._count?.messages ?? 0);
    }, 0);

    const contactIds = new Set(
      conversations
        .map((conversation) => conversation.contact?.id)
        .filter((id): id is string => Boolean(id))
    );

    const activeConversations = conversations.filter(
      (conversation) => conversation.status && conversation.status !== "CLOSED"
    ).length;

    return [
      {
        label: "Mensagens registradas",
        value: messageCount,
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
        )
      },
      {
        label: "Conversas ativas",
        value: activeConversations,
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
        )
      },
      {
        label: "Contatos ativos",
        value: contactIds.size,
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
        )
      },
      {
        label: "Automações instaladas",
        value: instancesCount,
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
        )
      }
    ];
  }, [conversations, instancesCount]);

  const chartData = useMemo(() => {
    const today = new Date();
    const days: { label: string; count: number }[] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayLabel = formatDayLabel(date);
      const count = auditLogs.filter((log) => {
        const logDate = new Date(log.createdAt);
        return (
          logDate.getFullYear() === date.getFullYear() &&
          logDate.getMonth() === date.getMonth() &&
          logDate.getDate() === date.getDate()
        );
      }).length;

      days.push({ label: dayLabel, count });
    }

    return days;
  }, [auditLogs]);

  const slaSeconds = Number(process.env.NEXT_PUBLIC_SLA_RESPONSE_SECONDS ?? 900);

  const conversationResponseMetrics = useMemo(() => {
    const responseTimes = conversations
      .map((conversation) => {
        if (!conversation.lastMessageAt) return null;
        const created = new Date(conversation.createdAt).getTime();
        const lastMessage = new Date(conversation.lastMessageAt).getTime();
        if (Number.isNaN(created) || Number.isNaN(lastMessage) || lastMessage < created) return null;
        return (lastMessage - created) / 1000;
      })
      .filter((value): value is number => value !== null);

    const averageResponseSeconds =
      responseTimes.reduce((total, current) => total + current, 0) /
      (responseTimes.length || 1);

    const slaCompliance =
      responseTimes.length === 0
        ? 0
        : (responseTimes.filter((value) => value <= slaSeconds).length / responseTimes.length) * 100;

    const closedConversations = conversations.filter(
      (conversation) => conversation.status === "CLOSED"
    ).length;

    const conversionRate =
      conversations.length === 0 ? 0 : (closedConversations / conversations.length) * 100;

    return {
      averageResponseSeconds,
      slaCompliance,
      conversionRate,
      responseTimes
    };
  }, [conversations, slaSeconds]);

  const kpiCards = [
    {
      label: "TMR (Tempo médio de resposta)",
      value: formatDuration(conversationResponseMetrics.averageResponseSeconds),
      helper: "Baseado no tempo entre abertura e última mensagem",
      accent: "bg-blue-100 text-blue-700"
    },
    {
      label: "SLA (primeira resposta)",
      value: `${conversationResponseMetrics.slaCompliance.toFixed(0)}%`,
      helper: `Meta: responder em até ${Math.round(slaSeconds / 60)} min`,
      accent: "bg-emerald-100 text-emerald-700"
    },
    {
      label: "Conversão (conversas fechadas)",
      value: `${conversationResponseMetrics.conversionRate.toFixed(0)}%`,
      helper: "Conversas concluídas sobre o total",
      accent: "bg-purple-100 text-purple-700"
    }
  ];

  const activityChartData = useMemo(() => {
    const today = new Date();
    const days: { label: string; count: number; avgResponse: number }[] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayLabel = formatDayLabel(date);
      const dailyConversations = conversations.filter((conversation) => {
        const created = new Date(conversation.createdAt);
        return (
          created.getFullYear() === date.getFullYear() &&
          created.getMonth() === date.getMonth() &&
          created.getDate() === date.getDate()
        );
      });

      const avgResponse =
        dailyConversations.reduce((total, conversation) => {
          if (!conversation.lastMessageAt) return total;
          const created = new Date(conversation.createdAt).getTime();
          const lastMessage = new Date(conversation.lastMessageAt).getTime();
          if (Number.isNaN(created) || Number.isNaN(lastMessage) || lastMessage < created) {
            return total;
          }
          return total + (lastMessage - created) / 1000;
        }, 0) / (dailyConversations.length || 1);

      days.push({ label: dayLabel, count: dailyConversations.length, avgResponse });
    }

    return days;
  }, [conversations]);

  const recentActivity = useMemo(() => {
    return auditLogs.slice(0, 6).map((log) => {
      const metadataName = typeof log.metadata?.name === "string" ? log.metadata?.name : null;
      const actionLabel = actionLabels[log.action] ?? log.action;
      const description = metadataName ? `${actionLabel}: ${metadataName}` : `${actionLabel} ${log.entity}`;
      return {
        id: log.id,
        user: `Usuário ${log.userId.slice(0, 8)}`,
        action: description,
        time: formatRelativeTime(log.createdAt),
        status: log.action
      };
    });
  }, [auditLogs]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-slate-900 px-6 shadow-sm">
        <SidebarNav variant="client" />
        <h1 className="text-xl font-semibold text-slate-100">
          Painel de Controle
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/workspaces"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Workspaces ({workspaces.length})
          </Link>
          <Link
            href="/inbox"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Inbox
          </Link>
          <Link
            href="/search"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Busca global
          </Link>
          <Link
            href="/companies"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Empresas
          </Link>
          {isAdmin ? (
            <>
              <Link
                href="/admin/custom-fields"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Campos customizados
              </Link>
              <Link
                href="/admin/integrations"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Integrações
              </Link>
              <Link
                href="/admin/automations"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Templates
              </Link>
              <Link
                href="/admin/knowledge-base"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Base de conhecimento
              </Link>
              <Link
                href="/admin/canned-responses"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Respostas rápidas
              </Link>
              <Link
                href="/admin/billing"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Cobrança
              </Link>
            </>
          ) : null}
          {isSuperAdmin ? (
            <Link
              href="/super-admin"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Super Admin
            </Link>
          ) : null}
          <Link
            href="/dashboard/variables"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Variáveis
          </Link>
          <Button variant="outline" size="sm">
            Ajuda
          </Button>
          <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-200 font-bold">
            U
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-100">
                Bem-vindo de volta!
              </h2>
              <p className="text-slate-400">
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

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Mapa rápido do CRM",
                description:
                  "O dashboard resume conversas, tarefas e performance do funil em tempo real.",
                highlight: "Visão 360°"
              },
              {
                title: "Marketplace de agentes",
                description:
                  "Ative agentes de IA e automações para acelerar atendimento, vendas e CS.",
                highlight: "Marketplace"
              },
              {
                title: "Próximos passos",
                description:
                  "Crie um workspace, cadastre empresas e organize o inbox por filas.",
                highlight: "Ação"
              }
            ].map((card) => (
              <div key={card.title} className="rounded-xl border bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-100">{card.title}</p>
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200">
                    {card.highlight}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-400">{card.description}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="rounded-xl border bg-slate-900 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-slate-400">
                    {stat.label}
                  </span>
                  <div className="rounded-md bg-slate-950 p-2">{stat.icon}</div>
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {loading ? "-" : stat.value}
                </div>
              </div>
            ))}
          </div>

          <TaskOverview />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-100">
                  BI de Atendimento & Comercial
                </h3>
                <p className="text-sm text-slate-400">
                  KPIs críticos para acompanhar a saúde do funil.
                </p>
              </div>
              <Button variant="outline" size="sm">
                Exportar relatório
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {kpiCards.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border bg-slate-900 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">{kpi.label}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${kpi.accent}`}>
                      KPI
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-100">
                    {loading ? "-" : kpi.value}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{kpi.helper}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-7">
            <div className="col-span-4 rounded-xl border bg-slate-900 shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-slate-100">
                  Atividade do workspace
                </h3>
                <p className="text-sm text-slate-400">Últimos 7 dias</p>
                {loading ? (
                  <div className="mt-6 text-sm text-slate-400">Carregando dados...</div>
                ) : (
                  <div className="mt-6 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#E5E7EB" fontSize={12} />
                        <Tooltip
                          formatter={(value) => [`${value}`, "Eventos"]}
                          cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                        />
                        <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-3 rounded-xl border bg-slate-900 shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-slate-100">
                  Atividade Recente
                </h3>
                <p className="text-sm text-slate-400">
                  Últimas ações no sistema
                </p>
              </div>
              <div className="border-t">
                {loading ? (
                  <div className="p-6 text-sm text-slate-400">Carregando histórico...</div>
                ) : recentActivity.length === 0 ? (
                  <div className="p-6 text-sm text-slate-400">Nenhuma atividade registrada.</div>
                ) : (
                  recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b p-4 last:border-0 hover:bg-slate-950"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300">
                          {item.user
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-100">
                            {item.action}
                          </p>
                          <p className="text-xs text-slate-400">{item.user}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">{item.time}</p>
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t bg-slate-950 rounded-b-xl">
                <Button variant="outline" className="w-full text-sm">
                  Ver todo o histórico
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-slate-900 p-6 shadow-sm">
              <h3 className="text-lg font-medium text-slate-100">
                Volume de conversas
              </h3>
              <p className="text-sm text-slate-400">Última semana</p>
              {loading ? (
                <div className="mt-6 text-sm text-slate-400">Carregando dados...</div>
              ) : (
                <div className="mt-6 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityChartData}>
                      <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#E5E7EB" fontSize={12} allowDecimals={false} />
                      <Tooltip formatter={(value) => [`${value}`, "Conversas"]} />
                      <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="rounded-xl border bg-slate-900 p-6 shadow-sm">
              <h3 className="text-lg font-medium text-slate-100">
                TMR diário
              </h3>
              <p className="text-sm text-slate-400">Tempo médio de resposta por dia</p>
              {loading ? (
                <div className="mt-6 text-sm text-slate-400">Carregando dados...</div>
              ) : (
                <div className="mt-6 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityChartData}>
                      <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#E5E7EB" fontSize={12} />
                      <Tooltip
                        formatter={(value) => [formatDuration(Number(value)), "TMR"]}
                      />
                      <Line type="monotone" dataKey="avgResponse" stroke="#10B981" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
