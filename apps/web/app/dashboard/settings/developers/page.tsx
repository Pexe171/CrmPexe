"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot, Copy, GitBranch, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type WorkspaceVariable = {
  id: string;
  key: string;
  value: string | null;
  isSensitive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  key: string;
  value: string;
  description: string;
  isSensitive: boolean;
};

const inputClassName =
  "h-11 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60";

const textareaClassName =
  "min-h-24 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60";

const initialFormState: FormState = {
  key: "",
  value: "",
  description: "",
  isSensitive: true
};

function inferSensitiveByKey(variableKey: string) {
  return /(API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE|WEBHOOK)/i.test(variableKey);
}

export default function SettingsDevelopersPage() {
  const [variables, setVariables] = useState<WorkspaceVariable[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariable, setEditingVariable] =
    useState<WorkspaceVariable | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);

  async function loadVariables() {
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/workspace-variables", {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(payload?.message ?? "Falha ao carregar credenciais.");
      }

      const payload = (await response.json()) as WorkspaceVariable[];
      setVariables(Array.isArray(payload) ? payload : []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar credenciais.";
      setFeedback(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadVariables();
  }, []);

  const filteredVariables = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return variables;
    }

    return variables.filter((variable) =>
      variable.key.toLowerCase().includes(normalizedSearch)
    );
  }, [search, variables]);

  function handleOpenCreateModal() {
    setEditingVariable(null);
    setForm(initialFormState);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(variable: WorkspaceVariable) {
    setEditingVariable(variable);
    setForm({
      key: variable.key,
      value: "",
      description: "",
      isSensitive: variable.isSensitive
    });
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setForm(initialFormState);
    setEditingVariable(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const normalizedKey = form.key.trim().toUpperCase();
    const payload = {
      key: normalizedKey,
      value: form.value,
      isSensitive: form.isSensitive
    };

    try {
      const response = await fetch("/api/workspace-variables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(errorPayload?.message ?? "Falha ao salvar credencial.");
      }

      await loadVariables();
      setFeedback(
        editingVariable
          ? "Credencial atualizada com sucesso."
          : "Credencial criada com sucesso."
      );
      handleCloseModal();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao salvar credencial."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy(variable: WorkspaceVariable) {
    try {
      const copyValue = variable.isSensitive
        ? "Configurado (valor sensível oculto)"
        : (variable.value ?? "");

      await navigator.clipboard.writeText(copyValue);
      setCopyFeedback(`Valor de ${variable.key} copiado.`);
      window.setTimeout(() => setCopyFeedback(null), 1800);
    } catch {
      setCopyFeedback("Não foi possível copiar para a área de transferência.");
      window.setTimeout(() => setCopyFeedback(null), 1800);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <Card className="overflow-hidden border-slate-800">
        <CardHeader className="space-y-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">
                Credenciais de Integração
              </CardTitle>
              <CardDescription className="text-slate-300">
                Cadastre tokens, API keys e IDs utilizados pelos agentes de
                automação no n8n. Valores sensíveis nunca retornam em texto puro
                no frontend.
              </CardDescription>
            </div>

            <Button
              type="button"
              className="gap-2"
              onClick={handleOpenCreateModal}
            >
              <Plus className="h-4 w-4" />
              Nova Credencial
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar por nome da chave (ex: WHATSAPP_)"
                className={`${inputClassName} pl-9`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            {copyFeedback ? (
              <p className="text-sm text-emerald-300">{copyFeedback}</p>
            ) : (
              <p className="text-sm text-slate-400">
                Total visível: {filteredVariables.length}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {feedback ? (
            <div className="border-b border-slate-800 bg-slate-900/40 px-6 py-3 text-sm text-slate-200">
              {feedback}
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NOME DA VARIÁVEL</TableHead>
                <TableHead>VALOR</TableHead>
                <TableHead>USADA EM</TableHead>
                <TableHead className="text-right">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-slate-400"
                  >
                    Carregando credenciais...
                  </TableCell>
                </TableRow>
              ) : filteredVariables.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-slate-400"
                  >
                    Nenhuma credencial encontrada para o filtro atual.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVariables.map((variable) => (
                  <TableRow key={variable.id}>
                    <TableCell className="font-medium text-slate-100">
                      {variable.key}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-300">
                          {variable.isSensitive
                            ? "••••••••••••"
                            : (variable.value ?? "Não informado")}
                        </span>
                        {variable.isSensitive ? (
                          <span className="rounded-full border border-emerald-600/50 bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-300">
                            Configurado
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(variable)}
                          className="gap-1"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                          <Bot className="h-3.5 w-3.5" />
                          Agentes
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                          <GitBranch className="h-3.5 w-3.5" />
                          Fluxos
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleOpenEditModal(variable)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseModal();
          }
          setIsModalOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariable ? "Editar credencial" : "Nova credencial"}
            </DialogTitle>
            <DialogDescription>
              {editingVariable
                ? "Informe um novo valor para sobrescrever a credencial atual."
                : "Cadastre uma nova variável para uso dos agentes e fluxos."}
            </DialogDescription>
          </DialogHeader>

          <form className="mt-4 space-y-4" onSubmit={handleSave}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">
                Nome da variável
              </span>
              <input
                type="text"
                required
                disabled={Boolean(editingVariable)}
                className={inputClassName}
                placeholder="OPENAI_API_KEY"
                value={form.key}
                onChange={(event) => {
                  const nextKey = event.target.value.toUpperCase();
                  setForm((previous) => ({
                    ...previous,
                    key: nextKey,
                    isSensitive: inferSensitiveByKey(nextKey)
                  }));
                }}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Valor</span>
              <input
                type={form.isSensitive ? "password" : "text"}
                required
                className={inputClassName}
                placeholder={
                  form.isSensitive
                    ? "Cole aqui o token/chave"
                    : "Digite o valor da variável"
                }
                value={form.value}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    value: event.target.value
                  }))
                }
                autoComplete="off"
              />
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={form.isSensitive}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    isSensitive: event.target.checked
                  }))
                }
              />
              Tratar como credencial sensível (recomendado e padrão para API
              keys)
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">
                Ajuda / Descrição
              </span>
              <textarea
                className={textareaClassName}
                placeholder="Ex: Esta chave é usada pelo Agente de Vendas para gerar respostas automáticas."
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    description: event.target.value
                  }))
                }
              />
            </label>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSaving}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Salvando..."
                  : editingVariable
                    ? "Salvar"
                    : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
