"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type KnowledgeBaseArticle = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ArticleFormState = {
  title: string;
  content: string;
  tags: string;
  isActive: boolean;
};

const emptyForm: ArticleFormState = {
  title: "",
  content: "",
  tags: "",
  isActive: true
};

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ArticleFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const fetchArticles = useCallback(async (currentSearch = "") => {
    setLoading(true);
    setError(null);

    try {
      const searchParam = currentSearch.trim();
      const query = searchParam ? `?search=${encodeURIComponent(searchParam)}` : "";
      const response = await fetch(`${apiUrl}/api/knowledge-base-articles${query}`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar os artigos.");
      }

      const data = (await response.json()) as KnowledgeBaseArticle[];
      setArticles(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao carregar artigos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchArticles(search);
  }, [fetchArticles, search]);

  const handleChange =
    (field: keyof ArticleFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === "isActive" && "checked" in event.target
        ? (event.target.checked as unknown as boolean)
        : event.target.value;

      setFormState((prev) => ({
        ...prev,
        [field]: value
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
      title: formState.title,
      content: formState.content,
      tags: formState.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      isActive: formState.isActive
    };

    try {
      const response = await fetch(`${apiUrl}/api/knowledge-base-articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar o artigo.");
      }

      resetForm();
      await fetchArticles(search);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado ao salvar artigo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/knowledge-base-articles/${articleId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível remover o artigo.");
      }

      await fetchArticles(search);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erro inesperado ao remover artigo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Admin</p>
          <h1 className="text-2xl font-semibold text-gray-900">Base de conhecimento</h1>
          <p className="text-sm text-gray-500">
            Centralize artigos com informações úteis para o time de atendimento.
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Artigos cadastrados</h2>
              <p className="text-sm text-gray-500">
                Atualize e organize o conteúdo que o time consulta durante o atendimento.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                placeholder="Buscar artigo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button variant="outline" onClick={() => fetchArticles(search)} disabled={loading}>
                Atualizar lista
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Carregando artigos...
            </div>
          ) : articles.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
              Nenhum artigo cadastrado ainda. Use o formulário ao lado para criar o primeiro.
            </div>
          ) : (
            <div className="grid gap-4">
              {articles.map((article) => (
                <div key={article.id} className="rounded-xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
                        {!article.isActive ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            Inativo
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{article.content}</p>
                      {article.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {article.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <Button variant="outline" onClick={() => handleDelete(article.id)} disabled={submitting}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="w-full max-w-md space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Novo artigo</h2>
          <p className="text-sm text-gray-500">
            Escreva o conteúdo e adicione tags para facilitar a busca durante o atendimento.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Título
              <input
                type="text"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                value={formState.title}
                onChange={handleChange("title")}
                required
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Conteúdo
              <textarea
                className="mt-2 min-h-[120px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                value={formState.content}
                onChange={handleChange("content")}
                required
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Tags (separadas por vírgula)
              <input
                type="text"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                value={formState.tags}
                onChange={handleChange("tags")}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={handleChange("isActive")}
              />
              Artigo ativo
            </label>

            {error ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar artigo"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
