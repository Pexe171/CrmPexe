"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type AutomationTemplateVersion = {
  id: string;
  version: string;
  changelog?: string | null;
  createdAt: string;
};

type AutomationTemplate = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  version: string;
  changelog?: string | null;
  requiredIntegrations: string[];
  definitionJson: Record<string, unknown>;
  currentVersion?: AutomationTemplateVersion | null;
  createdAt: string;
  updatedAt: string;
};

type TemplateFormState = {
  name: string;
  description: string;
  category: string;
  version: string;
  changelog: string;
  requiredIntegrations: string;
  definitionJson: string;
};

type VersionFormState = {
  templateId: string;
  version: string;
  changelog: string;
  requiredIntegrations: string;
  definitionJson: string;
  name: string;
  description: string;
  category: string;
};

const emptyTemplateForm: TemplateFormState = {
  name: "",
  description: "",
  category: "",
  version: "",
  changelog: "",
  requiredIntegrations: "",
  definitionJson: ""
};

const emptyVersionForm: VersionFormState = {
  templateId: "",
  version: "",
  changelog: "",
  requiredIntegrations: "",
  definitionJson: "",
  name: "",
  description: "",
  category: ""
};

const parseJson = (value: string) => {
  if (!value.trim()) {
    throw new Error("O JSON da automação é obrigatório.");
  }

  return JSON.parse(value);
};

export default function AutomationTemplatesAdminPage() {
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [templateForm, setTemplateForm] =
    useState<TemplateFormState>(emptyTemplateForm);
  const [versionForm, setVersionForm] =
    useState<VersionFormState>(emptyVersionForm);
  const [versionsByTemplate, setVersionsByTemplate] = useState<
    Record<string, AutomationTemplateVersion[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [versionSubmitting, setVersionSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/automation-templates`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar os templates.");
      }

      const data = (await response.json()) as AutomationTemplate[];
      setTemplates(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao carregar templates."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => a.name.localeCompare(b.name));
  }, [templates]);

  const handleSubmitTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/automation-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: templateForm.name,
          description: templateForm.description || null,
          category: templateForm.category,
          version: templateForm.version,
          changelog: templateForm.changelog || null,
          requiredIntegrations: templateForm.requiredIntegrations
            ? templateForm.requiredIntegrations
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
          definitionJson: parseJson(templateForm.definitionJson)
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Erro ao criar template.");
      }

      setTemplateForm(emptyTemplateForm);
      await loadTemplates();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro inesperado ao criar template."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loadVersions = async (templateId: string) => {
    if (!templateId || versionsByTemplate[templateId]) {
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/api/automation-templates/${templateId}/versions`,
        {
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível carregar as versões.");
      }

      const data = (await response.json()) as AutomationTemplateVersion[];
      setVersionsByTemplate((prev) => ({ ...prev, [templateId]: data }));
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao carregar versões."
      );
    }
  };

  const handleSubmitVersion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!versionForm.templateId) {
      setError("Selecione um template para versionar.");
      return;
    }

    setVersionSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/automation-templates/${versionForm.templateId}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            version: versionForm.version,
            changelog: versionForm.changelog || null,
            requiredIntegrations: versionForm.requiredIntegrations
              ? versionForm.requiredIntegrations
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : [],
            definitionJson: parseJson(versionForm.definitionJson),
            name: versionForm.name || undefined,
            description: versionForm.description || undefined,
            category: versionForm.category || undefined
          })
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Erro ao criar versão.");
      }

      setVersionForm((prev) => ({
        ...emptyVersionForm,
        templateId: prev.templateId
      }));
      setVersionsByTemplate((prev) => {
        const next = { ...prev };
        delete next[versionForm.templateId];
        return next;
      });
      await loadTemplates();
      await loadVersions(versionForm.templateId);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro inesperado ao criar versão."
      );
    } finally {
      setVersionSubmitting(false);
    }
  };

  const selectedVersions = versionForm.templateId
    ? (versionsByTemplate[versionForm.templateId] ?? [])
    : [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-purple-600">Super Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Templates de automação
          </h1>
          <p className="text-sm text-gray-500">
            Crie versões, registre changelog e publique templates para o
            marketplace interno.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/super-admin">
              <Button variant="outline">Voltar ao painel</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Biblioteca publicada
            </h2>
            <p className="text-sm text-gray-500">
              Gerencie templates ativos e acompanhe o histórico de versões.
            </p>

            {loading ? (
              <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-gray-500">
                Carregando templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-gray-500">
                Nenhum template publicado ainda.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {sortedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-xl border bg-gray-50 p-4 text-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Categoria {template.category} · Versão atual{" "}
                          {template.version}
                        </p>
                        {template.changelog ? (
                          <p className="mt-2 text-xs text-gray-600">
                            Changelog: {template.changelog}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void loadVersions(template.id)}
                      >
                        Ver versões
                      </Button>
                    </div>

                    {versionsByTemplate[template.id]?.length ? (
                      <div className="mt-3 space-y-2">
                        {versionsByTemplate[template.id].map((version) => (
                          <div
                            key={version.id}
                            className="rounded-lg border bg-white px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-gray-800">
                              {version.version}
                            </p>
                            {version.changelog ? (
                              <p className="text-xs text-gray-500">
                                {version.changelog}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Novo template
              </h2>
              <p className="text-sm text-gray-500">
                Publica a primeira versão (v1, v2...).
              </p>

              <form className="mt-4 space-y-4" onSubmit={handleSubmitTemplate}>
                <label className="flex flex-col gap-2 text-sm text-gray-700">
                  Nome
                  <input
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={templateForm.name}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        name: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-gray-700">
                  Descrição
                  <input
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={templateForm.description}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        description: event.target.value
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-gray-700">
                  Categoria
                  <input
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={templateForm.category}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        category: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-gray-700">
                    Versão
                    <input
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={templateForm.version}
                      onChange={(event) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          version: event.target.value
                        }))
                      }
                      placeholder="v1"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-gray-700">
                    Changelog
                    <input
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={templateForm.changelog}
                      onChange={(event) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          changelog: event.target.value
                        }))
                      }
                      placeholder="Resumo das mudanças"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-2 text-sm text-gray-700">
                  Integrações obrigatórias (separadas por vírgula)
                  <input
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={templateForm.requiredIntegrations}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        requiredIntegrations: event.target.value
                      }))
                    }
                    placeholder="ex.: whatsapp,n8n"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-gray-700">
                  Definition JSON
                  <textarea
                    className="min-h-[140px] rounded-lg border border-gray-200 px-3 py-2 text-xs"
                    value={templateForm.definitionJson}
                    onChange={(event) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        definitionJson: event.target.value
                      }))
                    }
                    placeholder='{"name": "Fluxo", "nodes": []}'
                    required
                  />
                </label>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Publicando..." : "Publicar template"}
                </Button>
              </form>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Nova versão
              </h2>
              <p className="text-sm text-gray-500">
                Atualize template com changelog e versão.
              </p>

              <form className="mt-4 space-y-4" onSubmit={handleSubmitVersion}>
                <label className="flex flex-col gap-2 text-sm text-gray-700">
                  Template
                  <select
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={versionForm.templateId}
                    onChange={(event) => {
                      const templateId = event.target.value;
                      setVersionForm((prev) => ({ ...prev, templateId }));
                      void loadVersions(templateId);
                    }}
                    required
                  >
                    <option value="">Selecione um template</option>
                    {sortedTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-gray-700">
                    Nova versão
                    <input
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={versionForm.version}
                      onChange={(event) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          version: event.target.value
                        }))
                      }
                      placeholder="v2"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-gray-700">
                    Changelog
                    <input
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={versionForm.changelog}
                      onChange={(event) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          changelog: event.target.value
                        }))
                      }
                      placeholder="Resumo das mudanças"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-2 text-sm text-gray-700">
                  Integrações obrigatórias (separadas por vírgula)
                  <input
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={versionForm.requiredIntegrations}
                    onChange={(event) =>
                      setVersionForm((prev) => ({
                        ...prev,
                        requiredIntegrations: event.target.value
                      }))
                    }
                    placeholder="ex.: whatsapp,n8n"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-gray-700">
                  Definition JSON
                  <textarea
                    className="min-h-[140px] rounded-lg border border-gray-200 px-3 py-2 text-xs"
                    value={versionForm.definitionJson}
                    onChange={(event) =>
                      setVersionForm((prev) => ({
                        ...prev,
                        definitionJson: event.target.value
                      }))
                    }
                    placeholder='{"name": "Fluxo atualizado", "nodes": []}'
                    required
                  />
                </label>

                <div className="rounded-xl border border-dashed p-4 text-xs text-gray-500">
                  <p className="font-semibold text-gray-700">
                    Ajustes opcionais do template
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={versionForm.name}
                      onChange={(event) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          name: event.target.value
                        }))
                      }
                      placeholder="Nome (opcional)"
                    />
                    <input
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={versionForm.category}
                      onChange={(event) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          category: event.target.value
                        }))
                      }
                      placeholder="Categoria (opcional)"
                    />
                  </div>
                  <input
                    className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={versionForm.description}
                    onChange={(event) =>
                      setVersionForm((prev) => ({
                        ...prev,
                        description: event.target.value
                      }))
                    }
                    placeholder="Descrição (opcional)"
                  />
                </div>

                {versionForm.templateId ? (
                  <div className="rounded-xl border bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700">
                      Histórico de versões
                    </p>
                    {selectedVersions.length === 0 ? (
                      <p className="mt-2">Nenhuma versão encontrada.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {selectedVersions.map((version) => (
                          <li key={version.id}>
                            {version.version}{" "}
                            {version.changelog ? `· ${version.changelog}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <Button type="submit" disabled={versionSubmitting}>
                  {versionSubmitting ? "Salvando..." : "Criar versão"}
                </Button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
