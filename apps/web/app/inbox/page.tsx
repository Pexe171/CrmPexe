"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { fetchWorkspaceBillingSummary, type BillingSummary } from "@/lib/billing";
import {
  conversationsPageSize,
  fetchConversationDetails as fetchConversationDetailsApi,
  fetchConversationSummary as fetchConversationSummaryApi,
  fetchConversations as fetchConversationsApi,
  sendConversationMessage,
  type Conversation,
  type ConversationSummary,
  type Message
} from "@/lib/api/conversations";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const basePollIntervalMs = 5000;
const maxPollIntervalMs = 15000;
const pollBackoffStepMs = 5000;
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
    frio: { text: "Lead frio", className: "bg-slate-800 text-slate-100" },
    morno: { text: "Lead morno", className: "bg-amber-500/20 text-amber-200" },
    quente: { text: "Lead quente", className: "bg-emerald-500/20 text-emerald-200" }
  };

  const config = palette[resolvedLabel] ?? palette.frio;
  const scoreText = score !== null ? ` • ${score}` : "";

  return {
    text: `${config.text}${scoreText}`,
    className: config.className
  };
};

const channelOptions = [
  { key: "all", label: "Todos" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "email", label: "E-mail" }
];

const normalizeChannel = (channel?: string | null) => channel?.toLowerCase() ?? "outros";

const resolveChannelMeta = (channel?: string | null) => {
  const normalized = normalizeChannel(channel);
  const palette: Record<string, { label: string; icon: string; className: string; badgeClassName: string }> = {
    whatsapp: {
      label: "WhatsApp",
      icon: "💬",
      className: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30",
      badgeClassName: "bg-emerald-500/20 text-emerald-200"
    },
    instagram: {
      label: "Instagram",
      icon: "📸",
      className: "bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/30",
      badgeClassName: "bg-fuchsia-500/20 text-fuchsia-200"
    },
    email: {
      label: "E-mail",
      icon: "✉️",
      className: "bg-sky-500/20 text-sky-200 border border-sky-500/30",
      badgeClassName: "bg-sky-500/20 text-sky-200"
    }
  };

  return (
    palette[normalized] ?? {
      label: "Outro",
      icon: "🔔",
      className: "bg-slate-800 text-slate-200 border border-slate-700",
      badgeClassName: "bg-slate-800 text-slate-200"
    }
  );
};

type CannedResponse = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  shortcut?: string | null;
};

type KnowledgeBaseArticle = {
  id: string;
  title: string;
  content: string;
  tags: string[];
};

const resolveNextPollInterval = ({
  currentInterval,
  hasUpdate,
  isHidden
}: {
  currentInterval: number;
  hasUpdate: boolean;
  isHidden: boolean;
}) => {
  if (isHidden) {
    return maxPollIntervalMs;
  }

  if (hasUpdate) {
    return basePollIntervalMs;
  }

  return Math.min(currentInterval + pollBackoffStepMs, maxPollIntervalMs);
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [cannedSearch, setCannedSearch] = useState("");
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [cannedLoading, setCannedLoading] = useState(false);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [conversationSummary, setConversationSummary] = useState<ConversationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [pollingIntervalMs, setPollingIntervalMs] = useState(basePollIntervalMs);
  const [channelFilter, setChannelFilter] = useState("all");
  const lastMessageSignatureRef = useRef<string>("");
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = useRef(basePollIntervalMs);
  const isTabHiddenRef = useRef(false);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const totalConversations = useMemo(() => conversations.length, [conversations]);
  const openConversations = useMemo(
    () => conversations.filter((conversation) => conversation.status !== "CLOSED").length,
    [conversations]
  );
  const totalMessages = useMemo(
    () =>
      conversations.reduce((total, conversation) => total + (conversation._count?.messages ?? 0), 0),
    [conversations]
  );

  const scrollToBottom = () => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const appendToDraft = (text: string) => {
    setMessageDraft((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const sortConversations = useCallback((items: Conversation[]) => {
    return [...items].sort((first, second) => {
      const firstDate = first.lastMessageAt ?? first.createdAt;
      const secondDate = second.lastMessageAt ?? second.createdAt;
      const firstTime = firstDate ? new Date(firstDate).getTime() : 0;
      const secondTime = secondDate ? new Date(secondDate).getTime() : 0;
      if (firstTime !== secondTime) {
        return secondTime - firstTime;
      }
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }, []);

  const mergeConversations = useCallback(
    (current: Conversation[], incoming: Conversation[]) => {
      const merged = new Map<string, Conversation>();
      incoming.forEach((conversation) => merged.set(conversation.id, conversation));
      current.forEach((conversation) => {
        if (!merged.has(conversation.id)) {
          merged.set(conversation.id, conversation);
        }
      });
      return sortConversations(Array.from(merged.values()));
    },
    [sortConversations]
  );

  const fetchConversations = useCallback(
    async ({
      page = 1,
      append = false,
      signal
    }: {
      page?: number;
      append?: boolean;
      signal?: AbortSignal;
    }) => {
    try {
      if (!append) {
        setLoading(true);
      }
      const data = await fetchConversationsApi({ page, limit: conversationsPageSize, signal });
      setHasMoreConversations(data.length === conversationsPageSize);
      setConversations((prev) => (append ? mergeConversations(prev, data) : mergeConversations([], data)));
      if (!append) {
        setCurrentPage(page);
      }
      setActiveConversationId((prev) => (data.length > 0 ? prev ?? data[0].id : null));
      if (!append && data.length === 0) {
        setMessages([]);
      }
      setError(null);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao buscar conversas.");
      if (!append) {
        setConversations([]);
        setActiveConversationId(null);
        setMessages([]);
      }
    } finally {
      if (!append) {
        setLoading(false);
      }
      setLoadingMoreConversations(false);
    }
  },
    [mergeConversations]
  );

  const handleLoadMoreConversations = async () => {
    if (loadingMoreConversations || !hasMoreConversations) {
      return;
    }
    const nextPage = currentPage + 1;
    setLoadingMoreConversations(true);
    setCurrentPage(nextPage);
    await fetchConversations({ page: nextPage, append: true });
  };

  const fetchConversationDetails = useCallback(async (conversationId: string, signal?: AbortSignal) => {
    try {
      const data = await fetchConversationDetailsApi(conversationId, signal);
      setMessages(data.messages ?? []);
      setError(null);
      return data;
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return null;
      }
      setError(fetchError instanceof Error ? fetchError.message : "Erro inesperado ao buscar mensagens.");
      setMessages([]);
      return null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchConversations({ page: 1, append: false, signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [fetchConversations]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      const term = cannedSearch.trim();
      setCannedLoading(true);
      try {
        const query = term ? `?search=${encodeURIComponent(term)}&isActive=true` : "?isActive=true";
        const response = await fetch(`${apiUrl}/api/canned-responses${query}`, { credentials: "include" });
        if (!response.ok) {
          throw new Error("Não foi possível buscar respostas rápidas.");
        }
        const data = (await response.json()) as CannedResponse[];
        setCannedResponses(data);
      } catch {
        setCannedResponses([]);
      } finally {
        setCannedLoading(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [cannedSearch]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      const term = knowledgeSearch.trim();
      setKnowledgeLoading(true);
      try {
        const query = term ? `?search=${encodeURIComponent(term)}&isActive=true` : "?isActive=true";
        const response = await fetch(`${apiUrl}/api/knowledge-base-articles${query}`, { credentials: "include" });
        if (!response.ok) {
          throw new Error("Não foi possível buscar artigos.");
        }
        const data = (await response.json()) as KnowledgeBaseArticle[];
        setKnowledgeArticles(data);
      } catch {
        setKnowledgeArticles([]);
      } finally {
        setKnowledgeLoading(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [knowledgeSearch]);

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

    let isCancelled = false;
    lastMessageSignatureRef.current = "";
    pollingIntervalRef.current = basePollIntervalMs;
    setPollingIntervalMs(basePollIntervalMs);

    const scheduleNextPoll = (delay: number) => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      pollingTimeoutRef.current = setTimeout(() => {
        void poll();
      }, delay);
    };

    const poll = async () => {
      if (isCancelled) return;

      await fetchConversations({ page: 1, append: false });
      const details = await fetchConversationDetails(activeConversationId);

      const messagesList = details?.messages ?? [];
      const lastMessage = messagesList[messagesList.length - 1];
      const signature = `${messagesList.length}-${lastMessage?.id ?? ""}-${lastMessage?.sentAt ?? ""}`;
      const hasUpdate = signature !== lastMessageSignatureRef.current;

      if (hasUpdate) {
        lastMessageSignatureRef.current = signature;
      }

      const nextInterval = resolveNextPollInterval({
        currentInterval: pollingIntervalRef.current,
        hasUpdate,
        isHidden: isTabHiddenRef.current
      });

      pollingIntervalRef.current = nextInterval;
      setPollingIntervalMs(nextInterval);
      scheduleNextPoll(nextInterval);
    };

    scheduleNextPoll(0);

    return () => {
      isCancelled = true;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [activeConversationId, fetchConversations, fetchConversationDetails]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabHiddenRef.current = document.hidden;

      if (!document.hidden) {
        pollingIntervalRef.current = basePollIntervalMs;
        setPollingIntervalMs(basePollIntervalMs);
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }
        pollingTimeoutRef.current = setTimeout(() => {
          if (activeConversationId) {
            void fetchConversations({ page: 1, append: false });
            void fetchConversationDetails(activeConversationId);
          }
        }, 0);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeConversationId, fetchConversations, fetchConversationDetails]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    const channelTerm = channelFilter === "all" ? "" : channelFilter;
    return conversations.filter((conversation) => {
      const name = conversation.contact?.name?.toLowerCase() ?? "";
      const email = conversation.contact?.email?.toLowerCase() ?? "";
      const phone = conversation.contact?.phone?.toLowerCase() ?? "";
      const matchesSearch = !term || name.includes(term) || email.includes(term) || phone.includes(term);
      const matchesChannel =
        !channelTerm || normalizeChannel(conversation.channel) === normalizeChannel(channelTerm);
      return matchesSearch && matchesChannel;
    });
  }, [conversations, search, channelFilter]);

  const isCannedShortcutActive = useMemo(() => messageDraft.trim().startsWith("/"), [messageDraft]);
  const cannedShortcutTerm = useMemo(() => messageDraft.trim().slice(1).toLowerCase(), [messageDraft]);
  const cannedShortcutResults = useMemo(() => {
    if (!isCannedShortcutActive) return [];
    const term = cannedShortcutTerm.trim();
    return cannedResponses.filter((response) => {
      if (!term) return true;
      const title = response.title.toLowerCase();
      const content = response.content.toLowerCase();
      const shortcut = response.shortcut?.toLowerCase() ?? "";
      return title.includes(term) || content.includes(term) || shortcut.includes(term);
    });
  }, [cannedResponses, cannedShortcutTerm, isCannedShortcutActive]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const activeLeadBadge = resolveLeadBadge(activeConversation?.contact);
  const activeChannelMeta = resolveChannelMeta(activeConversation?.channel);

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
      await sendConversationMessage({ conversationId: activeConversationId, text: newMessage.text ?? "" });

      await fetchConversationDetails(activeConversationId);
      await fetchConversations({ page: 1, append: false });
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
      const data = await fetchConversationSummaryApi(activeConversationId);
      setConversationSummary(data);
    } catch (summaryError) {
      setError(summaryError instanceof Error ? summaryError.message : "Erro inesperado ao gerar resumo.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const isReadOnly = billingSummary?.isDelinquent ?? false;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-slate-900 px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <SidebarNav variant="client" />
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Inbox</h1>
            <p className="text-xs text-slate-400">
              Atualização automática a cada {pollingIntervalMs / 1000}s (polling adaptativo).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          {loading ? "Sincronizando..." : "Conectado"}
        </div>
      </header>
      <div className="border-b bg-slate-900 px-6 py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-4">
          {[
            { label: "Conversas totais", value: loading ? "-" : totalConversations },
            { label: "Conversas abertas", value: loading ? "-" : openConversations },
            { label: "Mensagens registradas", value: loading ? "-" : totalMessages }
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-slate-950 px-4 py-3 text-sm">
              <p className="text-xs font-medium text-slate-400">{stat.label}</p>
              <p className="mt-1 text-base font-semibold text-slate-100">{stat.value}</p>
            </div>
          ))}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-200">
            O inbox é o coração do CRM marketplace: monitore SLAs, filas e agentes em tempo real.
          </div>
        </div>
      </div>
      {isReadOnly ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700">
          Workspace inadimplente. O envio de mensagens está bloqueado e o atendimento está em modo somente leitura.
        </div>
      ) : null}

      <main className="flex flex-1 gap-0 overflow-hidden">
        <aside className="flex w-full max-w-sm flex-col border-r bg-slate-900">
          <div className="border-b px-4 py-3">
            <label className="text-xs font-medium text-slate-400">Buscar conversas</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="Nome, email ou telefone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {channelOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    channelFilter === option.key
                      ? "bg-blue-600 text-white"
                      : "border border-slate-800 bg-slate-950 text-slate-300 hover:border-blue-500"
                  }`}
                  onClick={() => setChannelFilter(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const contactName = conversation.contact?.name ?? "Contato sem nome";
              const leadBadge = resolveLeadBadge(conversation.contact);
              const channelMeta = resolveChannelMeta(conversation.channel);
              return (
                <button
                  key={conversation.id}
                  className={`flex w-full flex-col gap-2 border-b px-4 py-4 text-left transition ${
                    isActive ? "bg-blue-50" : "hover:bg-slate-950"
                  }`}
                  onClick={() => setActiveConversationId(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${channelMeta.className}`}
                        aria-label={channelMeta.label}
                        title={channelMeta.label}
                      >
                        {channelMeta.icon}
                      </span>
                      <span className="text-sm font-semibold text-slate-100">{contactName}</span>
                      {leadBadge && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${leadBadge.className}`}>
                          {leadBadge.text}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(conversation.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{conversation.contact?.email ?? conversation.contact?.phone ?? "Sem contato"}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      {conversation._count?.messages ?? 0} msgs
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredConversations.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-400">
                {loading ? "Carregando conversas..." : "Nenhuma conversa encontrada."}
              </div>
            )}
            {filteredConversations.length > 0 && (
              <div className="px-4 py-4">
                <Button
                  type="button"
                  className="w-full bg-gray-900 text-xs text-white hover:bg-gray-800"
                  onClick={handleLoadMoreConversations}
                  disabled={loadingMoreConversations || !hasMoreConversations}
                >
                  {loadingMoreConversations ? "Carregando..." : hasMoreConversations ? "Carregar mais" : "Fim da lista"}
                </Button>
              </div>
            )}
          </div>
        </aside>

        <section className="flex flex-1 flex-col bg-slate-950">
          <div className="border-b bg-slate-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-100">
                    {activeConversation?.contact?.name ?? "Selecione uma conversa"}
                  </h2>
                  {activeConversation ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeChannelMeta.badgeClassName}`}
                    >
                      <span>{activeChannelMeta.icon}</span>
                      {activeChannelMeta.label}
                    </span>
                  ) : null}
                  {activeLeadBadge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeLeadBadge.className}`}
                    >
                      {activeLeadBadge.text}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {activeConversation?.contact?.email ?? activeConversation?.contact?.phone ?? "Sem detalhes do contato"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Responsável</p>
                <p className="text-sm font-medium text-slate-200">
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
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 text-sm text-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-200">Resumo da conversa</span>
                  <span>Gerado em {formatDateTime(conversationSummary.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">{conversationSummary.text}</p>
                {conversationSummary.bullets.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {conversationSummary.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Respostas rápidas</h3>
                  <span className="text-xs text-slate-500">
                    {cannedLoading ? "Buscando..." : `${cannedResponses.length} itens`}
                  </span>
                </div>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="Buscar resposta..."
                  value={cannedSearch}
                  onChange={(event) => setCannedSearch(event.target.value)}
                />
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-slate-300">
                  {cannedResponses.length === 0 ? (
                    <p className="text-slate-500">Nenhuma resposta encontrada.</p>
                  ) : (
                    cannedResponses.map((response) => (
                      <button
                        key={response.id}
                        type="button"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50"
                        onClick={() => appendToDraft(response.content)}
                      >
                        <p className="font-medium text-slate-100">{response.title}</p>
                        {response.shortcut ? (
                          <p className="text-[10px] text-slate-500">Atalho: {response.shortcut}</p>
                        ) : null}
                        <p className="mt-1 max-h-10 overflow-hidden text-[11px] text-slate-400">{response.content}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Base de conhecimento</h3>
                  <span className="text-xs text-slate-500">
                    {knowledgeLoading ? "Buscando..." : `${knowledgeArticles.length} itens`}
                  </span>
                </div>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="Buscar artigo..."
                  value={knowledgeSearch}
                  onChange={(event) => setKnowledgeSearch(event.target.value)}
                />
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-slate-300">
                  {knowledgeArticles.length === 0 ? (
                    <p className="text-slate-500">Nenhum artigo encontrado.</p>
                  ) : (
                    knowledgeArticles.map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                        onClick={() => appendToDraft(article.content)}
                      >
                        <p className="font-medium text-slate-100">{article.title}</p>
                        <p className="mt-1 max-h-10 overflow-hidden text-[11px] text-slate-400">{article.content}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900 px-4 py-6 text-center text-sm text-slate-400">
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
                          : "bg-zinc-800 text-slate-100 border border-zinc-700"
                      }`}
                    >
                      <p className="leading-relaxed">{message.text}</p>
                      <span className={`mt-2 block text-[10px] ${isOutgoing ? "text-blue-100" : "text-slate-500"}`}>
                        {formatTime(message.sentAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="border-t bg-slate-900 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                placeholder={
                  isReadOnly
                    ? "Envio bloqueado por inadimplência."
                    : "Digite sua mensagem ou use / para respostas rápidas..."
                }
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                disabled={!activeConversationId || isReadOnly || billingLoading}
                ref={messageInputRef}
              />
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!activeConversationId || isReadOnly || billingLoading}
              >
                Enviar
              </Button>
            </div>
            {isCannedShortcutActive && !isReadOnly && activeConversationId ? (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-100">Respostas rápidas</p>
                  <span className="text-[10px] text-slate-500">
                    {cannedShortcutResults.length} sugestão(ões)
                  </span>
                </div>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {cannedShortcutResults.length === 0 ? (
                    <p className="text-slate-500">Nenhuma resposta encontrada para o termo informado.</p>
                  ) : (
                    cannedShortcutResults.map((response) => (
                      <button
                        key={response.id}
                        type="button"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        onClick={() => {
                          setMessageDraft(response.content);
                          messageInputRef.current?.focus();
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-100">{response.title}</p>
                          {response.shortcut ? (
                            <span className="text-[10px] text-slate-500">{response.shortcut}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{response.content}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Atalho: digite / para listar respostas rápidas.</p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
