import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "@/lib/api/conversations";
import type { ConversationListItem, ConversationDetail } from "@/lib/api/conversations";
import {
  MessageSquare, Search, Send, User, Phone, Mail, Clock,
  CheckCircle, AlertCircle, XCircle, Filter, Hash,
  UserCheck, Bot, ArrowDown, Loader2, Star, X
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Todas", color: "text-foreground" },
  { value: "NEW", label: "Novas", color: "text-green-400" },
  { value: "OPEN", label: "Abertas", color: "text-blue-400" },
  { value: "CONTACTED", label: "Contatados", color: "text-yellow-400" },
  { value: "PROPOSAL", label: "Propostas", color: "text-purple-400" },
  { value: "CLOSED", label: "Fechadas", color: "text-muted-foreground" },
];

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    NEW: { label: "Novo", color: "text-green-400", bg: "bg-green-500/20" },
    OPEN: { label: "Aberta", color: "text-blue-400", bg: "bg-blue-500/20" },
    CONTACTED: { label: "Contatado", color: "text-yellow-400", bg: "bg-yellow-500/20" },
    PROPOSAL: { label: "Proposta", color: "text-purple-400", bg: "bg-purple-500/20" },
    CLOSED: { label: "Fechada", color: "text-muted-foreground", bg: "bg-muted" },
  };
  return map[status] ?? { label: status, color: "text-muted-foreground", bg: "bg-muted" };
}

function channelIcon(channel: string) {
  const map: Record<string, { label: string; color: string }> = {
    whatsapp: { label: "WhatsApp", color: "text-green-400" },
    instagram: { label: "Instagram", color: "text-pink-400" },
    messenger: { label: "Messenger", color: "text-blue-400" },
    email: { label: "E-mail", color: "text-cyan-400" },
    voip: { label: "VoIP", color: "text-orange-400" },
  };
  return map[channel] ?? { label: channel, color: "text-muted-foreground" };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function ContactPanel({ conversation }: { conversation: ConversationDetail }) {
  const c = conversation.contact;
  const s = statusConfig(conversation.status);
  const ch = channelIcon(conversation.channel);
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      conversationsApi.updateStatus(conversation.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] });
    }
  });

  const closeMutation = useMutation({
    mutationFn: () => conversationsApi.close(conversation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] });
    }
  });

  return (
    <div className="w-72 border-l border-border flex flex-col overflow-auto">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{c.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 text-sm">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato</h4>

        {c.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{c.phone}</span>
          </div>
        )}
        {c.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{c.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className={ch.color}>{ch.label}</span>
        </div>

        {c.leadScore != null && (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>Lead Score: {c.leadScore}</span>
            {c.leadScoreLabel && (
              <span className="text-xs text-muted-foreground">({c.leadScoreLabel})</span>
            )}
          </div>
        )}

        {conversation.assignedToUser && (
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{conversation.assignedToUser.name}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            {new Date(conversation.createdAt).toLocaleDateString("pt-BR")}
          </span>
        </div>

        {conversation.firstResponseTimeSeconds != null && (
          <div className="text-xs text-muted-foreground">
            1a resposta: {Math.round(conversation.firstResponseTimeSeconds / 60)}min
          </div>
        )}
      </div>

      <div className="p-4 space-y-2 border-t border-border">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acoes</h4>

        <select
          className="w-full h-9 rounded-md border bg-background px-3 text-xs"
          value={conversation.status}
          onChange={(e) => statusMutation.mutate(e.target.value)}
        >
          {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {conversation.status !== "CLOSED" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs gap-1"
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
          >
            <XCircle className="w-3 h-3" />
            {closeMutation.isPending ? "Fechando..." : "Fechar conversa"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const { data: me } = useAuthMe();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showContactPanel, setShowContactPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", filterStatus],
    queryFn: () => conversationsApi.list({
      status: filterStatus || undefined,
      limit: 100
    }),
    enabled: !!me?.currentWorkspaceId,
    refetchInterval: 5000,
    retry: 1
  });

  const { data: detail } = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: () => conversationsApi.getById(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 3000,
    retry: 1
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => conversationsApi.sendMessage(selectedId!, text),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (detail?.messages.length) {
      setTimeout(scrollToBottom, 100);
    }
  }, [detail?.messages.length, scrollToBottom]);

  const handleSend = () => {
    const text = messageText.trim();
    if (!text || !selectedId) return;
    sendMutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filtered = searchText
    ? conversations.filter((c) =>
        c.contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.contact.phone?.includes(searchText) ||
        c.contact.email?.toLowerCase().includes(searchText.toLowerCase())
      )
    : conversations;

  const openCount = conversations.filter((c) => c.status !== "CLOSED").length;

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-0px)]">
        {/* Left panel: conversation list */}
        <div className="w-80 lg:w-96 border-r border-border flex flex-col shrink-0">
          {/* Header */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversas
              </h1>
              {openCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  {openCount} abertas
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filterStatus === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="p-6 text-center">
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchText ? "Nenhum resultado encontrado." : "Nenhuma conversa."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  As conversas aparecem quando leads entram em contato via WhatsApp ou outros canais.
                </p>
              </div>
            )}

            {filtered.map((conv) => {
              const s = statusConfig(conv.status);
              const ch = channelIcon(conv.channel);
              const isSelected = selectedId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-accent/40 transition-colors ${
                    isSelected ? "bg-accent/60 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.bg}`}>
                      <User className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{conv.contact.name}</p>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {timeAgo(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs ${ch.color}`}>{ch.label}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className={`text-xs ${s.color}`}>{s.label}</span>
                        {conv.assignedToUser && (
                          <>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {conv.assignedToUser.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-14 h-14 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-medium">Selecione uma conversa</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha um contato a esquerda para iniciar o atendimento
                </p>
              </div>
            </div>
          ) : !detail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${statusConfig(detail.status).bg}`}>
                    <User className={`w-4 h-4 ${statusConfig(detail.status).color}`} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">{detail.contact.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {detail.contact.phone ?? detail.contact.email ?? "Sem contato"}
                      {" · "}
                      <span className={channelIcon(detail.channel).color}>
                        {channelIcon(detail.channel).label}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${statusConfig(detail.status).color} ${statusConfig(detail.status).bg}`}>
                    {statusConfig(detail.status).label}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowContactPanel(!showContactPanel)}
                    className="text-xs"
                  >
                    <User className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-auto px-4 py-3 space-y-2">
                {detail.messages.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                  </div>
                )}

                {detail.messages.map((msg) => {
                  const isIn = msg.direction === "IN";
                  const isSystem = msg.direction === "SYSTEM";
                  const isOut = msg.direction === "OUT";

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center py-1">
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[65%] px-3.5 py-2.5 rounded-2xl text-sm ${
                        isIn
                          ? "bg-accent rounded-bl-md"
                          : "bg-primary text-primary-foreground rounded-br-md"
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <p className={`text-xs mt-1 ${isOut ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {isOut && " ✓"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              {detail.status !== "CLOSED" ? (
                <div className="px-4 py-3 border-t border-border shrink-0">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Digite sua mensagem..."
                        rows={1}
                        className="w-full resize-none rounded-xl border bg-accent/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                        style={{ minHeight: "44px", maxHeight: "120px" }}
                      />
                    </div>
                    <Button
                      onClick={handleSend}
                      disabled={!messageText.trim() || sendMutation.isPending}
                      className="h-11 w-11 rounded-xl shrink-0 p-0"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  {sendMutation.isError && (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {sendMutation.error instanceof Error ? sendMutation.error.message : "Erro ao enviar mensagem."}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter para enviar · Shift+Enter para nova linha
                  </p>
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-border text-center shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                    <CheckCircle className="w-3 h-3" />
                    Conversa encerrada
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right panel: contact info */}
        {showContactPanel && detail && (
          <ContactPanel conversation={detail} />
        )}
      </div>
    </DashboardLayout>
  );
}
