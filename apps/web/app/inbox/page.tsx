"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { fetchWorkspaceBillingSummary, type BillingSummary } from "@/lib/billing";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const pollIntervalMs = 5000;

type Conversation = {
  id: string;
  status?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  contact?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    leadScore?: number | null;
    leadScoreLabel?: string | null;
  } | null;
  assignedToUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  _count?: {
    messages?: number | null;
  } | null;
};

type Message = {
  id: string;
  direction?: "IN" | "OUT" | string | null;
  text?: string | null;
  sentAt?: string | null;
};

type ConversationDetails = Conversation & {
  messages?: Message[];
};

type ConversationSummary = {
  id: string;
  conversationId: string;
  text: string;
  bullets: string[];
  createdAt: string;
};

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const resolveLeadBadge = (contact?: Conversation["contact"] | null) => {
  if (!contact) return null;
  const score = contact.leadScore ?? null;
  const label = contact.leadScoreLabel?.toLowerCase() ?? null;

  if (!label && score === null) return null;

  const resolvedLabel =
    label ?? (score !== null ? (score >= 70 ? "quente" : score >= 40 ? "morno" : "frio") : "frio");

  const palette: Record<string, { text: string; className: string }> = {
    frio: { text: "Lead frio", className: "bg-slate-100 text-slate-700" },
    morno: { text: "Lead morno", className: "bg-amber-100 text-amber-800" },
    quente: { text: "Lead quente", className: "bg-emerald-100 text-emerald-800" }
  };

  const config = palette[resolvedLabel] ?? palette.frio;
  const scoreText = score !== null ? ` • ${score}` : "";

  return {
    text: `${config.text}${scoreText}`,
    className: config.className
  };
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [conversationSummary, setConversationSummary] = useState<ConversationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const scrollToBottom = () => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`${apiUrl}/api/conversations`, {
        credentials: "include",
        signal
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar conversas.");
      }

      const data = (await response.json()) as Conversation[];
      setConversations(data);
      setActiveConversationId((prev) => (data.length > 0 ? prev ?? data[0].id : null));
      if (data.length === 0) {
        setMessages([]);
      }
      setError(null);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao buscar conversas.");
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversationDetails = useCallback(async (conversationId: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`${apiUrl}/api/conversations/${conversationId}`,
        {
          credentials: "include",
          signal
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível carregar mensagens.");
      }

      const data = (await response.json()) as ConversationDetails;
      setMessages(data.messages ?? []);
      setError(null);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao buscar mensagens.");
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchConversations(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchConversations]);

  useEffect(() => {
    const controller = new AbortController();

    const loadBillingSummary = async () => {
      setBillingLoading(true);
      try {
        const data = await fetchWorkspaceBillingSummary(controller.signal);
        setBillingSummary(data);
      } catch {
        setBillingSummary(null);
      } finally {
        setBillingLoading(false);
      }
    };

    void loadBillingSummary();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setConversationSummary(null);
      return;
    }
    setConversationSummary(null);
    const controller = new AbortController();
    void fetchConversationDetails(activeConversationId, controller.signal);

    return () => {
      controller.abort();
    };
  }, [activeConversationId, fetchConversationDetails]);

  useEffect(() => {
    if (!activeConversationId) return;

    const interval = setInterval(() => {
      void fetchConversations();
      void fetchConversationDetails(activeConversationId);
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [activeConversationId, fetchConversations, fetchConversationDetails]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) => {
      const name = conversation.contact?.name?.toLowerCase() ?? "";
      const email = conversation.contact?.email?.toLowerCase() ?? "";
      const phone = conversation.contact?.phone?.toLowerCase() ?? "";
      return name.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [conversations, search]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const activeLeadBadge = resolveLeadBadge(activeConversation?.contact);

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();

    if (billingSummary?.isDelinquent) {
      setError("Workspace inadimplente. O envio de mensagens está bloqueado até o pagamento ser regularizado.");
      return;
    }

    if (!activeConversationId || !messageDraft.trim()) {
      return;
    }

    const newMessage: Message = {
      id: `tmp-${Date.now()}`,
      direction: "OUT",
      text: messageDraft.trim(),
      sentAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageDraft("");

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversationId
          ? { ...conversation, lastMessageAt: newMessage.sentAt ?? conversation.lastMessageAt }
          : conversation
      )
    );

    try {
      const response = await fetch(`${apiUrl}/api/conversations/${activeConversationId}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ text: newMessage.text })
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível enviar a mensagem.");
      }

      await fetchConversationDetails(activeConversationId);
      await fetchConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Erro inesperado ao enviar mensagem.");
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeConversationId) {
      return;
    }

    setSummaryLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/ai/conversations/${activeConversationId}/summary`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível gerar o resumo.");
      }

      const data = (await response.json()) as ConversationSummary;
      setConversationSummary(data);
    } catch (summaryError) {
      setError(summaryError instanceof Error ? summaryError.message : "Erro inesperado ao gerar resumo.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const isReadOnly = billingSummary?.isDelinquent ?? false;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Inbox</h1>
          <p className="text-xs text-gray-500">Atualização automática a cada {pollIntervalMs / 1000}s (polling).</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          {loading ? "Sincronizando..." : "Conectado"}
        </div>
      </header>
      {isReadOnly ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700">
          Workspace inadimplente. O envio de mensagens está bloqueado e o atendimento está em modo somente leitura.
        </div>
      ) : null}

      <main className="flex flex-1 gap-0 overflow-hidden">
        <aside className="flex w-full max-w-sm flex-col border-r bg-white">
          <div className="border-b px-4 py-3">
            <label className="text-xs font-medium text-gray-500">Buscar conversas</label>
            <input
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="Nome, email ou telefone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const contactName = conversation.contact?.name ?? "Contato sem nome";
              const leadBadge = resolveLeadBadge(conversation.contact);
              return (
                <button
                  key={conversation.id}
                  className={`flex w-full flex-col gap-2 border-b px-4 py-4 text-left transition ${
                    isActive ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveConversationId(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{contactName}</span>
                      {leadBadge && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${leadBadge.className}`}>
                          {leadBadge.text}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(conversation.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{conversation.contact?.email ?? conversation.contact?.phone ?? "Sem contato"}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                      {conversation._count?.messages ?? 0} msgs
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredConversations.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500">
                {loading ? "Carregando conversas..." : "Nenhuma conversa encontrada."}
              </div>
            )}
          </div>
        </aside>

        <section className="flex flex-1 flex-col bg-gray-50">
          <div className="border-b bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeConversation?.contact?.name ?? "Selecione uma conversa"}
                  </h2>
                  {activeLeadBadge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeLeadBadge.className}`}
                    >
                      {activeLeadBadge.text}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {activeConversation?.contact?.email ?? activeConversation?.contact?.phone ?? "Sem detalhes do contato"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Responsável</p>
                <p className="text-sm font-medium text-gray-700">
                  {activeConversation?.assignedToUser?.name ?? "Fila sem responsável"}
                </p>
                <Button
                  type="button"
                  className="mt-3 w-full bg-gray-900 text-xs text-white hover:bg-gray-800"
                  onClick={handleGenerateSummary}
                  disabled={!activeConversationId || summaryLoading}
                >
                  {summaryLoading ? "Gerando resumo..." : "Gerar resumo"}
                </Button>
              </div>
            </div>
            {error && (
              <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}
            {conversationSummary && (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Resumo da conversa</span>
                  <span>Gerado em {formatDateTime(conversationSummary.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{conversationSummary.text}</p>
                {conversationSummary.bullets.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                    {conversationSummary.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                  {activeConversationId ? "Ainda não há mensagens nessa conversa." : "Selecione uma conversa para começar."}
                </div>
              )}
              {messages.map((message) => {
                const isOutgoing = message.direction === "OUT";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isOutgoing
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border border-gray-100"
                      }`}
                    >
                      <p className="leading-relaxed">{message.text}</p>
                      <span className={`mt-2 block text-[10px] ${isOutgoing ? "text-blue-100" : "text-gray-400"}`}>
                        {formatTime(message.sentAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="border-t bg-white px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                placeholder={isReadOnly ? "Envio bloqueado por inadimplência." : "Digite sua mensagem..."}
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                disabled={!activeConversationId || isReadOnly || billingLoading}
              />
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!activeConversationId || isReadOnly || billingLoading}
              >
                Enviar
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
