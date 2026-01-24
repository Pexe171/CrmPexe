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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Configurações</p>
          <h1 className="text-2xl font-semibold text-gray-900">Variáveis do workspace</h1>
          <p className="text-sm text-gray-500">
            Centralize tokens e IDs usados nos workflows instalados.
          </p>
          <div className="mt-3 flex gap-3">
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              Voltar ao dashboard
            </Link>
            <Button variant="outline" onClick={fetchVariables} disabled={loading}>
              Atualizar variáveis
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Nova variável</h2>
          <p className="mt-1 text-sm text-gray-500">
            {editingKey ? `Editando "${editingKey}".` : "Adicione uma nova chave para os fluxos."}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500">Chave</label>
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                placeholder="ex: SHEET_ID"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500">Valor</label>
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={valueInput}
                onChange={(event) => setValueInput(event.target.value)}
                placeholder={isSensitive ? "••••••••" : "Informe o valor"}
                type={isSensitive ? "password" : "text"}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={isSensitive}
                onChange={(event) => setIsSensitive(event.target.checked)}
              />
              Marcar como sensível (valor criptografado)
            </label>
            <div className="flex gap-2">
              {editingKey ? (
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar variável"}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Variáveis cadastradas</h2>
          <div className="mt-2 space-y-2 text-sm text-gray-500">
            {instructions.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          {loading ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              Carregando variáveis...
            </div>
          ) : variables.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              Nenhuma variável cadastrada ainda.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {variables.map((variable) => (
                <div
                  key={variable.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{variable.key}</p>
                    <p className="text-xs text-gray-500">
                      Atualizada em {new Date(variable.updatedAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                      {variable.isSensitive ? "••••••••" : variable.value || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {variable.isSensitive ? (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                        Sensível
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        Visível
                      </span>
                    )}
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
