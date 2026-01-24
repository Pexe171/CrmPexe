"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
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

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [instances, setInstances] = useState<AutomationInstance[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [conversationsResponse, instancesResponse, workspacesResponse, auditResponse] = await Promise.all([
          fetch(`${apiUrl}/api/conversations`, { credentials: "include" }),
          fetch(`${apiUrl}/api/automation-instances`, { credentials: "include" }),
          fetch(`${apiUrl}/api/workspaces`, { credentials: "include" }),
          fetch(`${apiUrl}/api/audit-logs?perPage=20`, { credentials: "include" })
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
          (instancesResponse.json() as Promise<AutomationInstance[]>),
          (workspacesResponse.json() as Promise<WorkspaceResponse>),
          (auditResponse.json() as Promise<{ data: AuditLog[] }>),
        ]);

        setConversations(conversationsData);
        setInstances(instancesData);
        setWorkspaces(workspacesData.workspaces);
        setAuditLogs(auditData.data ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar o dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

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
        value: instances.length,
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
  }, [conversations, instances]);

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

  const maxChartValue = chartData.reduce((max, item) => Math.max(max, item.count), 0) || 1;

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
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">
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
            href="/companies"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Empresas
          </Link>
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
            Automações
          </Link>
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

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}

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
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? "-" : stat.value}
                </div>
              </div>
            ))}
          </div>

          <TaskOverview />

          <div className="grid gap-4 md:grid-cols-7">
            <div className="col-span-4 rounded-xl border bg-white shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Atividade do workspace
                </h3>
                <p className="text-sm text-gray-500">Últimos 7 dias</p>
                {loading ? (
                  <div className="mt-6 text-sm text-gray-500">Carregando dados...</div>
                ) : (
                  <div className="mt-6 flex h-[300px] items-end justify-between gap-2 px-2">
                    {chartData.map((item, i) => (
                      <div key={i} className="group relative w-full">
                        <div
                          className="w-full rounded-t-md bg-blue-500 transition-all hover:bg-blue-600"
                          style={{ height: `${(item.count / maxChartValue) * 100}%` }}
                        ></div>
                        <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-400">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
                {loading ? (
                  <div className="p-6 text-sm text-gray-500">Carregando histórico...</div>
                ) : recentActivity.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">Nenhuma atividade registrada.</div>
                ) : (
                  recentActivity.map((item) => (
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
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
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
