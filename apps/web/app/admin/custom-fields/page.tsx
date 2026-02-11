"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type CustomFieldEntity = "COMPANY" | "CONTACT" | "DEAL";
type CustomFieldType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "MULTI_SELECT"
  | "BOOLEAN";

type CustomFieldDefinition = {
  id: string;
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[] | null;
  createdAt: string;
  updatedAt: string;
};

type CustomFieldFormState = {
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string;
};

const entityOptions: { value: CustomFieldEntity; label: string }[] = [
  { value: "COMPANY", label: "Empresa" },
  { value: "CONTACT", label: "Contato" },
  { value: "DEAL", label: "Negócio" }
];

const typeOptions: { value: CustomFieldType; label: string }[] = [
  { value: "TEXT", label: "Texto" },
  { value: "NUMBER", label: "Número" },
  { value: "DATE", label: "Data" },
  { value: "SELECT", label: "Seleção única" },
  { value: "MULTI_SELECT", label: "Seleção múltipla" },
  { value: "BOOLEAN", label: "Sim/Não" }
];

const emptyForm: CustomFieldFormState = {
  entity: "COMPANY",
  key: "",
  label: "",
  type: "TEXT",
  required: false,
  options: ""
};

export default function CustomFieldsAdminPage() {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<CustomFieldFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDefinitions = useCallback(async (entity?: CustomFieldEntity) => {
    setLoading(true);
    setError(null);

    try {
      const query = entity ? `?entity=${entity}` : "";
      const response = await fetch(
        `${apiUrl}/api/custom-field-definitions${query}`,
        {
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível carregar os campos customizados.");
      }

      const data = (await response.json()) as CustomFieldDefinition[];
      setDefinitions(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao carregar campos."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDefinitions(formState.entity);
  }, [fetchDefinitions, formState.entity]);

  const parsedOptions = useMemo(() => {
    if (!formState.options.trim()) {
      return null;
    }
    return formState.options
      .split(",")
      .map((option) => option.trim())
      .filter((option) => option.length > 0);
  }, [formState.options]);

  const requiresOptions =
    formState.type === "SELECT" || formState.type === "MULTI_SELECT";
  const hasInvalidOptions =
    requiresOptions && (!parsedOptions || parsedOptions.length === 0);

  const handleChange =
    (field: keyof CustomFieldFormState) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const value =
        field === "required"
          ? (event.target as HTMLInputElement).checked
          : event.target.value;
      setFormState((prev) => ({
        ...prev,
        [field]: value
      }));
    };

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      entity: formState.entity,
      key: formState.key,
      label: formState.label,
      type: formState.type,
      required: formState.required,
      options: parsedOptions
    };

    try {
      const response = await fetch(
        `${apiUrl}/api/custom-field-definitions${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível salvar o campo customizado.");
      }

      resetForm();
      await fetchDefinitions(formState.entity);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro inesperado ao salvar campo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (definition: CustomFieldDefinition) => {
    setEditingId(definition.id);
    setFormState({
      entity: definition.entity,
      key: definition.key,
      label: definition.label,
      type: definition.type,
      required: definition.required,
      options: definition.options?.join(", ") ?? ""
    });
  };

  const handleDelete = async (definitionId: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/custom-field-definitions/${definitionId}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível remover o campo customizado.");
      }

      await fetchDefinitions(formState.entity);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Erro inesperado ao remover campo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Campos customizados por entidade
          </h1>
          <p className="text-sm text-gray-500">
            Crie e gerencie definições de campos para empresas, contatos e
            negócios.
          </p>
          <div className="mt-3 flex gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Voltar ao dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row">
        <section className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Campos cadastrados
            </h2>
            <div className="flex items-center gap-3">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="entity-filter"
              >
                Entidade
              </label>
              <select
                id="entity-filter"
                value={formState.entity}
                onChange={handleChange("entity")}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {entityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => fetchDefinitions(formState.entity)}
                disabled={loading}
              >
                Atualizar lista
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Carregando campos...
            </div>
          ) : definitions.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Nenhum campo cadastrado para esta entidade.
            </div>
          ) : (
            <div className="grid gap-4">
              {definitions.map((definition) => (
                <div
                  key={definition.id}
                  className="rounded-xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {definition.label}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {definition.key} · {definition.type.replace("_", " ")}
                        {definition.required ? " · obrigatório" : ""}
                      </p>
                      {definition.options && definition.options.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Opções: {definition.options.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(definition)}
                      >
                        Editar
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleDelete(definition.id)}
                        disabled={submitting}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingId ? "Editar campo" : "Novo campo"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Defina a chave técnica e o tipo do campo que ficará disponível no
            CRM.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="field-entity"
              >
                Entidade
              </label>
              <select
                id="field-entity"
                value={formState.entity}
                onChange={handleChange("entity")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {entityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="field-key"
              >
                Chave (key)
              </label>
              <input
                id="field-key"
                type="text"
                value={formState.key}
                onChange={handleChange("key")}
                placeholder="ex: segmento"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="field-label"
              >
                Label
              </label>
              <input
                id="field-label"
                type="text"
                value={formState.label}
                onChange={handleChange("label")}
                placeholder="Segmento"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="field-type"
              >
                Tipo
              </label>
              <select
                id="field-type"
                value={formState.type}
                onChange={handleChange("type")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="field-required"
                type="checkbox"
                checked={formState.required}
                onChange={handleChange("required")}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700" htmlFor="field-required">
                Campo obrigatório
              </label>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="field-options"
              >
                Opções (separadas por vírgula)
              </label>
              <textarea
                id="field-options"
                value={formState.options}
                onChange={handleChange("options")}
                placeholder="Ex: SaaS, Industria, Varejo"
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {hasInvalidOptions && (
                <p className="text-xs text-red-500">
                  Inclua pelo menos uma opção para campos de seleção.
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={submitting || hasInvalidOptions}
              >
                {submitting
                  ? "Salvando..."
                  : editingId
                    ? "Atualizar campo"
                    : "Criar campo"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </aside>
      </main>
    </div>
  );
}
