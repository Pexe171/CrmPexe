"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";

type SearchResult = {
  contacts: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  }>;
  conversations: Array<{
    id: string;
    channel: string;
    status?: string | null;
    lastMessageAt?: string | null;
    contact?: {
      id: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    assignedToUser?: {
      id: string;
      name?: string | null;
      email?: string | null;
    } | null;
  }>;
  messages: Array<{
    id: string;
    text: string;
    sentAt: string;
    conversation?: {
      id: string;
      channel: string;
      contact?: {
        id: string;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
      } | null;
    } | null;
  }>;
  deals: Array<{
    id: string;
    title: string;
    stage?: string | null;
    amount?: number | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status?: string | null;
    dueAt?: string | null;
  }>;
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
        const response = await fetch(
          `/api/global-search?query=${encodeURIComponent(query)}`,
          {
            credentials: "include"
          }
        );

        if (!response.ok) {
          throw new Error("Não foi possível executar a busca global.");
        }

        const data = (await response.json()) as { results: SearchResult };
        setResults(data.results);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro inesperado ao buscar."
        );
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

  const resultStats = useMemo(() => {
    if (!results) {
      return {
        contacts: 0,
        conversations: 0,
        messages: 0,
        deals: 0,
        tasks: 0
      };
    }

    return {
      contacts: results.contacts.length,
      conversations: results.conversations.length,
      messages: results.messages.length,
      deals: results.deals.length,
      tasks: results.tasks.length
    };
  }, [results]);

  return (
    <div className="min-h-screen bg-slate-950 md:pl-72">
      <header className="border-b bg-slate-900 px-6 py-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <div className="flex items-center gap-3">
            <SidebarNav variant="client" />
            <p className="text-sm font-medium text-blue-600">Pesquisa</p>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Busca global
          </h1>
          <p className="text-sm text-slate-400">
            Localize rapidamente contatos, conversas, mensagens, deals e
            tarefas.
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
        <div className="rounded-xl border bg-slate-900 p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-200">
            Termo de busca
            <input
              type="text"
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Digite um nome, palavra ou número..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">
              Buscando resultados...
            </p>
          ) : null}

          {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

          {!loading && query.trim() && !hasAnyResults ? (
            <p className="mt-4 text-sm text-slate-400">
              Nenhum resultado encontrado para o termo informado.
            </p>
          ) : null}
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-5">
          {[
            { label: "Contatos", value: resultStats.contacts },
            { label: "Conversas", value: resultStats.conversations },
            { label: "Mensagens", value: resultStats.messages },
            { label: "Deals", value: resultStats.deals },
            { label: "Tarefas", value: resultStats.tasks }
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border bg-slate-900 p-4 text-center shadow-sm"
            >
              <p className="text-xs font-medium text-slate-400">{stat.label}</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                {loading ? "-" : stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200">
          <p className="font-semibold">Dica de uso</p>
          <p className="mt-2">
            Use termos curtos para encontrar contatos e conversas rapidamente. A
            busca global conecta dados do marketplace, inbox e tarefas em um
            único ponto.
          </p>
        </section>

        {results ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-100">Contatos</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {results.contacts.length === 0 ? (
                  <li>Nenhum contato encontrado.</li>
                ) : (
                  results.contacts.map((contact) => (
                    <li
                      key={contact.id}
                      className="rounded-lg border border-slate-800 p-3"
                    >
                      <p className="font-medium text-slate-100">
                        {contact.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {contact.email ??
                          contact.phone ??
                          "Sem contato cadastrado"}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-100">
                Conversas
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {results.conversations.length === 0 ? (
                  <li>Nenhuma conversa encontrada.</li>
                ) : (
                  results.conversations.map((conversation) => (
                    <li
                      key={conversation.id}
                      className="rounded-lg border border-slate-800 p-3"
                    >
                      <p className="font-medium text-slate-100">
                        {conversation.contact?.name ?? "Sem contato"} ·{" "}
                        {conversation.channel}
                      </p>
                      <p className="text-xs text-slate-400">
                        Responsável:{" "}
                        {conversation.assignedToUser?.name ?? "Não atribuído"}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-100">
                Mensagens
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {results.messages.length === 0 ? (
                  <li>Nenhuma mensagem encontrada.</li>
                ) : (
                  results.messages.map((message) => (
                    <li
                      key={message.id}
                      className="rounded-lg border border-slate-800 p-3"
                    >
                      <p className="font-medium text-slate-100">
                        {message.conversation?.contact?.name ?? "Sem contato"} ·{" "}
                        {message.conversation?.channel}
                      </p>
                      <p className="text-xs text-slate-400">{message.text}</p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-100">Deals</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {results.deals.length === 0 ? (
                  <li>Nenhum deal encontrado.</li>
                ) : (
                  results.deals.map((deal) => (
                    <li
                      key={deal.id}
                      className="rounded-lg border border-slate-800 p-3"
                    >
                      <p className="font-medium text-slate-100">{deal.title}</p>
                      <p className="text-xs text-slate-400">
                        {deal.stage ?? "Sem etapa"}{" "}
                        {deal.amount ? `· R$ ${deal.amount}` : ""}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border bg-slate-900 p-5 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-semibold text-slate-100">Tarefas</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {results.tasks.length === 0 ? (
                  <li>Nenhuma tarefa encontrada.</li>
                ) : (
                  results.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-slate-800 p-3"
                    >
                      <p className="font-medium text-slate-100">{task.title}</p>
                      <p className="text-xs text-slate-400">
                        Status: {task.status ?? "Pendente"}
                        {task.dueAt
                          ? ` · Vence em ${formatDate(task.dueAt) ?? task.dueAt}`
                          : ""}
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
