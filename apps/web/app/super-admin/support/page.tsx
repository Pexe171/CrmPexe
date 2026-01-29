"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fetchSuperAdminWorkspaces, type WorkspaceOverview } from "@/lib/super-admin";
import { fetchWorkspaceMembers, type WorkspaceMemberSummary } from "@/lib/support";

type ImpersonationFormState = {
  workspaceId: string;
  userId: string;
  reason: string;
};

export default function SupportImpersonationPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceOverview[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [formState, setFormState] = useState<ImpersonationFormState>({
    workspaceId: "",
    userId: "",
    reason: ""
  });
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadWorkspaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchSuperAdminWorkspaces(controller.signal);
        setWorkspaces(response.data ?? []);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro inesperado ao carregar workspaces."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadWorkspaces();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!formState.workspaceId) {
      setMembers([]);
      setFormState((prev) => ({ ...prev, userId: "" }));
      return;
    }

    const controller = new AbortController();

    const loadMembers = async () => {
      setMembersLoading(true);
      setError(null);
      try {
        const response = await fetchWorkspaceMembers(formState.workspaceId, controller.signal);
        setMembers(response);
        if (!response.find((member) => member.id === formState.userId)) {
          setFormState((prev) => ({ ...prev, userId: "" }));
        }
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro inesperado ao carregar membros."
        );
      } finally {
        setMembersLoading(false);
      }
    };

    void loadMembers();

    return () => controller.abort();
  }, [formState.userId, formState.workspaceId]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/support/impersonate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceId: formState.workspaceId,
          userId: formState.userId,
          reason: formState.reason
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Não foi possível iniciar o modo suporte.");
      }

      router.push("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro inesperado ao iniciar modo suporte."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          <p className="text-sm font-medium text-purple-600">Super Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">Impersonação de suporte</h1>
          <p className="text-sm text-gray-500">
            Gere um acesso temporário para investigar tickets em nome de um membro.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/super-admin">
              <Button variant="outline">Voltar ao painel</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Use apenas quando houver solicitação formal. As ações realizadas serão registradas no audit log.
        </div>

        <form
          className="rounded-2xl border bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4">
            <label className="flex flex-col gap-2 text-sm text-gray-700">
              Workspace
              <select
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={formState.workspaceId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, workspaceId: event.target.value }))
                }
                disabled={loading || submitting}
              >
                <option value="">
                  {loading ? "Carregando..." : "Selecione um workspace"}
                </option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-700">
              Membro do workspace
              <select
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={formState.userId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, userId: event.target.value }))
                }
                disabled={!formState.workspaceId || membersLoading || submitting}
              >
                <option value="">
                  {membersLoading ? "Carregando membros..." : "Selecione um membro"}
                </option>
                {sortedMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-700">
              Motivo do suporte (opcional)
              <textarea
                className="min-h-[96px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={formState.reason}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, reason: event.target.value }))
                }
                placeholder="Ex.: Cliente solicitou análise de automação."
                disabled={submitting}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={!formState.workspaceId || !formState.userId || submitting}>
              {submitting ? "Entrando no modo suporte..." : "Entrar em modo suporte"}
            </Button>
            <p className="text-xs text-gray-500">
              O acesso expira automaticamente e o banner de suporte será exibido no topo.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
