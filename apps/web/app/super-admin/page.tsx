"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  fetchSuperAdminErrorLogs,
  fetchSuperAdminWorkspaces,
  type ErrorLogSummary,
  type WorkspaceOverview
} from "@/lib/super-admin";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Ativo",
  PENDING: "Pendente",
  IN_PROCESS: "Em análise",
  REJECTED: "Inadimplente",
  CANCELED: "Cancelado",
  NO_SUBSCRIPTION: "Sem assinatura"
};

export default function SuperAdminPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceOverview[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [workspacesResponse, logsResponse] = await Promise.all([
          fetchSuperAdminWorkspaces(controller.signal),
          fetchSuperAdminErrorLogs(controller.signal)
        ]);

        setWorkspaces(workspacesResponse.data ?? []);
        setErrorLogs(logsResponse.data ?? []);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro inesperado ao carregar o painel do super admin."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();

    return () => controller.abort();
  }, []);

  const totalMensagens = useMemo(() => {
    return workspaces.reduce((total, workspace) => total + workspace.uso.mensagens, 0);
  }, [workspaces]);

  const totalAutomacoes = useMemo(() => {
    return workspaces.reduce((total, workspace) => total + workspace.uso.automacoes, 0);
  }, [workspaces]);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b bg-slate-900 px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex items-center gap-3">
            <SidebarNav variant="superadmin" />
            <p className="text-sm font-medium text-purple-600">Super Admin</p>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">Visão geral dos workspaces</h1>
          <p className="text-sm text-slate-400">
            Acompanhe planos, status e consumo de mensagens/automações em todos os workspaces.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Voltar ao dashboard</Button>
            </Link>
            <Link href="/super-admin/support">
              <Button variant="outline">Impersonação de suporte</Button>
            </Link>
            <Link href="/super-admin/templates">
              <Button variant="outline">Templates de automação</Button>
            </Link>
            <Link href="/super-admin/marketplace">
              <Button variant="outline">Agentes do CRM</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Workspaces monitorados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {loading ? "-" : workspaces.length}
            </p>
          </div>
          <div className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Mensagens processadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {loading ? "-" : totalMensagens}
            </p>
          </div>
          <div className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-400">Automações ativas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {loading ? "-" : totalAutomacoes}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Workspaces</h2>
              <p className="text-sm text-slate-400">Status, plano e uso consolidado.</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 pr-4">Workspace</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Plano</th>
                  <th className="py-3 pr-4">Mensagens</th>
                  <th className="py-3 pr-4">Automações</th>
                  <th className="py-3 pr-4">Atualização</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                      Carregando workspaces...
                    </td>
                  </tr>
                ) : workspaces.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                      Nenhum workspace encontrado.
                    </td>
                  </tr>
                ) : (
                  workspaces.map((workspace) => (
                    <tr key={workspace.id} className="text-slate-200">
                      <td className="py-4 pr-4 font-medium text-slate-100">
                        {workspace.name}
                      </td>
                      <td className="py-4 pr-4">
                        {statusLabel[workspace.status] ?? workspace.status}
                      </td>
                      <td className="py-4 pr-4">{workspace.plano}</td>
                      <td className="py-4 pr-4">{workspace.uso.mensagens}</td>
                      <td className="py-4 pr-4">{workspace.uso.automacoes}</td>
                      <td className="py-4 pr-4">
                        {formatDate(workspace.updatedAtPlano ?? workspace.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Logs de erro</h2>
              <p className="text-sm text-slate-400">
                Últimas falhas registradas em serviços de IA.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 pr-4">Workspace</th>
                  <th className="py-3 pr-4">Ação</th>
                  <th className="py-3 pr-4">Mensagem</th>
                  <th className="py-3 pr-4">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                      Carregando logs...
                    </td>
                  </tr>
                ) : errorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                      Nenhum log de erro encontrado.
                    </td>
                  </tr>
                ) : (
                  errorLogs.map((log) => (
                    <tr key={log.id} className="text-slate-200">
                      <td className="py-4 pr-4 font-medium text-slate-100">
                        {log.workspaceName}
                      </td>
                      <td className="py-4 pr-4">{log.action}</td>
                      <td className="py-4 pr-4">
                        {log.errorMessage ?? "Erro não detalhado"}
                      </td>
                      <td className="py-4 pr-4">{formatDate(log.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
