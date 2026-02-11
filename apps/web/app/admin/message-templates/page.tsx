"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type MessageTemplate = {
  id: string;
  name: string;
  language: string;
  content: string;
  channel: string;
  externalId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type TemplateFormState = {
  name: string;
  language: string;
  content: string;
  channel: string;
  externalId: string;
};

const emptyForm: TemplateFormState = {
  name: "",
  language: "pt_BR",
  content: "",
  channel: "whatsapp",
  externalId: ""
};

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/message-templates`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar os templates.");
      }

      const data = (await response.json()) as MessageTemplate[];
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
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleChange =
    (field: keyof TemplateFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({
        ...prev,
        [field]: event.target.value
      }));
    };

  const resetForm = () => {
    setFormState(emptyForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: formState.name,
      language: formState.language,
      content: formState.content,
      channel: formState.channel,
      externalId: formState.externalId || null
    };

    try {
      const response = await fetch(`${apiUrl}/api/message-templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar o template.");
      }

      resetForm();
      await fetchTemplates();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro inesperado ao salvar template."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/message-templates/${templateId}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível remover o template.");
      }

      await fetchTemplates();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Erro inesperado ao remover template."
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
            Templates de mensagem (WhatsApp)
          </h1>
          <p className="text-sm text-gray-500">
            Cadastre modelos de mensagem reutilizáveis por workspace para envio
            em conversas.
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Templates cadastrados
            </h2>
            <Button
              variant="outline"
              onClick={fetchTemplates}
              disabled={loading}
            >
              Atualizar lista
            </Button>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Carregando templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Nenhum template cadastrado ainda. Use o formulário ao lado para
              criar o primeiro.
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Canal: {template.channel} · Idioma: {template.language}
                      </p>
                      <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                        {template.content}
                      </p>
                      {template.externalId ? (
                        <p className="mt-2 text-xs text-gray-400">
                          External ID: {template.externalId}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(template.id)}
                      disabled={submitting}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="w-full max-w-md space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Novo template</h2>
          <p className="text-sm text-gray-500">
            Defina o nome, idioma e conteúdo do template que será enviado via
            WhatsApp.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Nome
              <input
                type="text"
                value={formState.name}
                onChange={handleChange("name")}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="ex: boletos_reenvio"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Idioma
              <input
                type="text"
                value={formState.language}
                onChange={handleChange("language")}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="pt_BR"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Canal
              <input
                type="text"
                value={formState.channel}
                onChange={handleChange("channel")}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="whatsapp"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Conteúdo
              <textarea
                value={formState.content}
                onChange={handleChange("content")}
                className="mt-2 min-h-[140px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Escreva o texto do template."
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              External ID (opcional)
              <input
                type="text"
                value={formState.externalId}
                onChange={handleChange("externalId")}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="ID do provedor"
              />
            </label>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar template"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
