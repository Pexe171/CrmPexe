"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type SearchResult = {
  contacts: Array<{ id: string; name: string; email?: string | null; phone?: string | null }>;
  conversations: Array<{
    id: string;
    channel: string;
    status?: string | null;
    lastMessageAt?: string | null;
    contact?: { id: string; name?: string | null; email?: string | null; phone?: string | null } | null;
    assignedToUser?: { id: string; name?: string | null; email?: string | null } | null;
  }>;
  messages: Array<{
    id: string;
    text: string;
    sentAt: string;
    conversation?: {
      id: string;
      channel: string;
      contact?: { id: string; name?: string | null; email?: string | null; phone?: string | null } | null;
    } | null;
  }>;
  deals: Array<{ id: string; title: string; stage?: string | null; amount?: number | null }>;
  tasks: Array<{ id: string; title: string; status?: string | null; dueAt?: string | null }>;
};

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("pt-BR");
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setError(null);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/api/global-search?query=${encodeURIComponent(query)}`, {
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error("Não foi possível executar a busca global.");
        }

        const data = (await response.json()) as { results: SearchResult };
        setResults(data.results);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao buscar.");
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [query]);

  const hasAnyResults = useMemo(() => {
    if (!results) return false;
    return (
      results.contacts.length ||
      results.conversations.length ||
      results.messages.length ||
      results.deals.length ||
      results.tasks.length
    );
  }, [results]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-sm font-medium text-blue-600">Pesquisa</p>
          <h1 className="text-2xl font-semibold text-gray-900">Busca global</h1>
          <p className="text-sm text-gray-500">
            Localize rapidamente contatos, conversas, mensagens, deals e tarefas.
          </p>
          <div className="mt-3 flex gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Voltar ao dashboard</Button>
            </Link>
            <Link href="/inbox">
              <Button variant="outline">Ir para o inbox</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700">
            Termo de busca
            <input
              type="text"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              placeholder="Digite um nome, palavra ou número..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Buscando resultados...</p>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-red-500">{error}</p>
          ) : null}

          {!loading && query.trim() && !hasAnyResults ? (
            <p className="mt-4 text-sm text-gray-500">Nenhum resultado encontrado para o termo informado.</p>
          ) : null}
        </div>

        {results ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">Contatos</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                {results.contacts.length === 0 ? (
                  <li>Nenhum contato encontrado.</li>
                ) : (
                  results.contacts.map((contact) => (
                    <li key={contact.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="font-medium text-gray-800">{contact.name}</p>
                      <p className="text-xs text-gray-500">
                        {contact.email ?? contact.phone ?? "Sem contato cadastrado"}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">Conversas</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                {results.conversations.length === 0 ? (
                  <li>Nenhuma conversa encontrada.</li>
                ) : (
                  results.conversations.map((conversation) => (
                    <li key={conversation.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="font-medium text-gray-800">
                        {conversation.contact?.name ?? "Sem contato"} · {conversation.channel}
                      </p>
                      <p className="text-xs text-gray-500">
                        Responsável: {conversation.assignedToUser?.name ?? "Não atribuído"}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">Mensagens</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                {results.messages.length === 0 ? (
                  <li>Nenhuma mensagem encontrada.</li>
                ) : (
                  results.messages.map((message) => (
                    <li key={message.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="font-medium text-gray-800">
                        {message.conversation?.contact?.name ?? "Sem contato"} · {message.conversation?.channel}
                      </p>
                      <p className="text-xs text-gray-500">{message.text}</p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">Deals</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                {results.deals.length === 0 ? (
                  <li>Nenhum deal encontrado.</li>
                ) : (
                  results.deals.map((deal) => (
                    <li key={deal.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="font-medium text-gray-800">{deal.title}</p>
                      <p className="text-xs text-gray-500">
                        {deal.stage ?? "Sem etapa"} {deal.amount ? `· R$ ${deal.amount}` : ""}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-800">Tarefas</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                {results.tasks.length === 0 ? (
                  <li>Nenhuma tarefa encontrada.</li>
                ) : (
                  results.tasks.map((task) => (
                    <li key={task.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="font-medium text-gray-800">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        Status: {task.status ?? "Pendente"}
                        {task.dueAt ? ` · Vence em ${formatDate(task.dueAt) ?? task.dueAt}` : ""}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
