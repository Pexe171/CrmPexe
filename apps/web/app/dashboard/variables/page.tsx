"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type WorkspaceVariable = {
  id: string;
  key: string;
  value: string | null;
  isSensitive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function WorkspaceVariablesPage() {
  const [variables, setVariables] = useState<WorkspaceVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchVariables = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/workspace-variables`, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Não foi possível carregar as variáveis do workspace.");
    }

    const data = (await response.json()) as WorkspaceVariable[];
    setVariables(data);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchVariables();
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar variáveis.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fetchVariables]);

  const resetForm = useCallback(() => {
    setKeyInput("");
    setValueInput("");
    setIsSensitive(false);
    setEditingKey(null);
  }, []);

  const handleSubmit = async () => {
    if (!keyInput.trim()) {
      setError("Informe a chave da variável.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/workspace-variables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          key: keyInput.trim(),
          value: valueInput.trim() ? valueInput.trim() : undefined,
          isSensitive
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar a variável.");
      }

      await fetchVariables();
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao salvar variável.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (variable: WorkspaceVariable) => {
    setKeyInput(variable.key);
    setValueInput("");
    setIsSensitive(variable.isSensitive);
    setEditingKey(variable.key);
  };

  const instructions = useMemo(() => {
    return [
      "Use estas variáveis para IDs, tokens e planilhas que os fluxos n8n precisam.",
      "Se marcar como sensível, o valor é criptografado e não fica visível na listagem."
    ];
  }, []);

  const stats = useMemo(() => {
    const total = variables.length;
    const sensitive = variables.filter((variable) => variable.isSensitive).length;
    const lastUpdated = variables
      .map((variable) => new Date(variable.updatedAt).getTime())
      .sort((a, b) => b - a)[0];

    return {
      total,
      sensitive,
      lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleString() : "-"
    };
  }, [variables]);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <header className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Configurações
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Variáveis do workspace</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Centralize tokens, IDs e chaves operacionais usados nos workflows instalados. Garanta
                consistência e segurança entre automações.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", className: "border-white/20 text-white hover:border-white/40" })}
              >
                Voltar ao dashboard
              </Link>
              <Button
                variant="outline"
                onClick={fetchVariables}
                disabled={loading}
                className="border-white/20 text-white hover:border-white/40"
              >
                Atualizar variáveis
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-sm backdrop-blur">
              <p className="text-xs text-slate-300">Total de variáveis</p>
              <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
              <p className="mt-2 text-xs text-slate-400">Inclui visíveis e sensíveis.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-sm backdrop-blur">
              <p className="text-xs text-slate-300">Variáveis sensíveis</p>
              <p className="mt-2 text-2xl font-semibold">{stats.sensitive}</p>
              <p className="mt-2 text-xs text-slate-400">Valores são criptografados.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-sm backdrop-blur">
              <p className="text-xs text-slate-300">Última atualização</p>
              <p className="mt-2 text-lg font-semibold">{stats.lastUpdated}</p>
              <p className="mt-2 text-xs text-slate-400">Com base na lista atual.</p>
            </div>
          </div>
        </header>
      </div>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Nova variável</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingKey
                    ? `Editando "${editingKey}". Atualize apenas o valor ou altere a sensibilidade.`
                    : "Cadastre uma nova chave para integrar fluxos e automações."}
                </p>
              </div>
              {editingKey ? (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                  Modo edição
                </span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Chave
                </label>
                <input
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={keyInput}
                  onChange={(event) => setKeyInput(event.target.value)}
                  placeholder="ex: SHEET_ID"
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Valor
                </label>
                <input
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={valueInput}
                  onChange={(event) => setValueInput(event.target.value)}
                  placeholder={isSensitive ? "••••••••" : "Informe o valor"}
                  type={isSensitive ? "password" : "text"}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
              <label className="flex items-center gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                  checked={isSensitive}
                  onChange={(event) => setIsSensitive(event.target.checked)}
                />
                Marcar como sensível (valor criptografado)
              </label>
              <div className="flex flex-wrap gap-2">
                {editingKey ? (
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                ) : null}
                <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500">
                  {saving ? "Salvando..." : "Salvar variável"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-white shadow-xl">
            <h3 className="text-lg font-semibold">Boas práticas</h3>
            <p className="mt-2 text-sm text-slate-300">
              Mantenha um padrão de nomenclatura único para facilitar a manutenção dos seus fluxos.
            </p>
            <div className="mt-6 space-y-4">
              {instructions.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-200">{item}</p>
                </div>
              ))}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-200">
                  Prefira chaves em caixa alta e valores segmentados por workspace.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Variáveis cadastradas</h2>
              <p className="mt-1 text-sm text-gray-500">Acompanhe o que está ativo nos workflows.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Atualizando" : `${variables.length} variáveis`}
            </span>
          </div>

          {loading ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              Carregando variáveis...
            </div>
          ) : variables.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              Nenhuma variável cadastrada ainda.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {variables.map((variable) => (
                <div
                  key={variable.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{variable.key}</p>
                      <p className="text-xs text-gray-500">
                        Atualizada em {new Date(variable.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    {variable.isSensitive ? (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        Sensível
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Visível
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    {variable.isSensitive ? "••••••••" : variable.value || "-"}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">ID: {variable.id}</span>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(variable)}>
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
