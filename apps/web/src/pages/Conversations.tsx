import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { MessageSquare, Clock, CheckCircle, AlertCircle, User } from "lucide-react";

type Conversation = {
  id: string;
  contactId: string;
  status: string;
  channel: string;
  lastMessageAt: string | null;
  createdAt: string;
  contact: { id: string; name: string; phone?: string | null; email?: string | null };
  assignedToUser?: { id: string; name: string } | null;
  _count?: { messages: number };
};

type ConversationDetail = Conversation & {
  messages: Array<{
    id: string;
    direction: string;
    text: string;
    sentAt: string;
  }>;
};

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    OPEN: { label: "Aberta", color: "text-blue-400", icon: MessageSquare },
    NEW: { label: "Nova", color: "text-green-400", icon: AlertCircle },
    CONTACTED: { label: "Contatado", color: "text-yellow-400", icon: Clock },
    PROPOSAL: { label: "Proposta", color: "text-purple-400", icon: Clock },
    CLOSED: { label: "Fechada", color: "text-muted-foreground", icon: CheckCircle },
  };
  return map[status] ?? { label: status, color: "text-muted-foreground", icon: MessageSquare };
}

function channelLabel(channel: string) {
  const map: Record<string, string> = {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    messenger: "Messenger",
    email: "E-mail",
    voip: "VoIP",
  };
  return map[channel] ?? channel;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ConversationsPage() {
  const { data: me } = useAuthMe();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiFetch<Conversation[]>("/conversations?limit=50"),
    enabled: !!me?.currentWorkspaceId,
    retry: 1
  });

  const { data: detail } = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: () => apiFetch<ConversationDetail>(`/conversations/${selectedId}`),
    enabled: !!selectedId,
    retry: 1
  });

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-0px)]">
        {/* Conversation list */}
        <div className="w-96 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversas
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading && (
              <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
            )}

            {!isLoading && conversations.length === 0 && (
              <div className="p-6 text-center">
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma conversa encontrada.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  As conversas aparecerao aqui quando leads entrarem em contato.
                </p>
              </div>
            )}

            {conversations.map((conv) => {
              const s = statusLabel(conv.status);
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-colors ${
                    selectedId === conv.id ? "bg-accent/70" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{conv.contact.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {channelLabel(conv.channel)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {conv.lastMessageAt && (
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(conv.lastMessageAt)}
                        </p>
                      )}
                      <span className={`text-xs ${s.color}`}>{s.label}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation detail */}
        <div className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Selecione uma conversa para visualizar
                </p>
              </div>
            </div>
          ) : detail ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{detail.contact.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {detail.contact.phone ?? detail.contact.email ?? "Sem contato"} · {channelLabel(detail.channel)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${statusLabel(detail.status).color}`}>
                  {statusLabel(detail.status).label}
                </span>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                {detail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[70%] p-3 rounded-xl text-sm ${
                      msg.direction === "IN"
                        ? "bg-accent mr-auto"
                        : msg.direction === "SYSTEM"
                        ? "bg-muted text-muted-foreground text-xs mx-auto text-center max-w-full"
                        : "bg-primary text-primary-foreground ml-auto"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.direction === "OUT" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(msg.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}

                {detail.messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma mensagem nesta conversa.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Carregando conversa...</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
