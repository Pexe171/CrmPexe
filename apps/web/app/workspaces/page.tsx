"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceResponse = {
  currentWorkspaceId: string | null;
  workspaces: Workspace[];
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/workspaces`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar os workspaces.");
      }

      const data = (await response.json()) as WorkspaceResponse;
      setWorkspaces(data.workspaces);
      setCurrentWorkspaceId(data.currentWorkspaceId);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao buscar workspaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreateWorkspace = async () => {
    const trimmedName = workspaceName.trim();
    if (!trimmedName) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ name: trimmedName })
      });

      if (!response.ok) {
        throw new Error("Não foi possível criar o workspace.");
      }

      setWorkspaceName("");
      await fetchWorkspaces();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Erro inesperado ao criar workspace.");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}/switch`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível trocar de workspace.");
      }

      const data = (await response.json()) as { currentWorkspaceId: string };
      setCurrentWorkspaceId(data.currentWorkspaceId);
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Erro inesperado ao trocar de workspace.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Workspaces</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Selecione o workspace para continuar
          </h1>
          <p className="text-sm text-gray-500">
            Gerencie ou crie um novo workspace para sua equipe.
          </p>
          {error ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row">
        <section className="flex-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Seus workspaces
          </h2>
          {loading ? (
            <div className="rounded-xl border bg-white p-5 text-sm text-gray-500 shadow-sm">
              Carregando workspaces...
            </div>
          ) : workspaces.length === 0 ? (
            <div className="rounded-xl border bg-white p-5 text-sm text-gray-500 shadow-sm">
              Nenhum workspace cadastrado ainda.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {workspaces.map((workspace) => {
                const isCurrent = workspace.id === currentWorkspaceId;
                return (
                  <div
                    key={workspace.id}
                    className="rounded-xl border bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {workspace.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Criado em {formatDate(workspace.createdAt)}
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Atual
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={saving || isCurrent}
                        onClick={() => handleSwitchWorkspace(workspace.id)}
                      >
                        {isCurrent ? "Em uso" : "Selecionar"}
                      </Button>
                      <Button variant="outline" disabled={saving}>
                        Configurar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            Criar novo workspace
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Defina um nome e comece a organizar seu time.
          </p>
          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium text-gray-700" htmlFor="workspace-name">
              Nome do workspace
            </label>
            <input
              id="workspace-name"
              type="text"
              placeholder="Ex: Operações Brasil"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={saving || !workspaceName.trim()}
              onClick={handleCreateWorkspace}
            >
              {saving ? "Salvando..." : "Criar workspace"}
            </Button>
            <p className="text-xs text-gray-400">
              As permissões e equipes podem ser configuradas depois.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
