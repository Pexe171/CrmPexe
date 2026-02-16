import { Skeleton } from "@/components/ui/skeleton";
import type { RecentConversation } from "@/lib/api/types";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  waiting: "bg-warning/10 text-warning",
  resolved: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  waiting: "Aguardando",
  resolved: "Resolvido",
};

interface RecentConversationsProps {
  data?: RecentConversation[];
  isLoading?: boolean;
}

export function RecentConversations({ data, isLoading }: RecentConversationsProps) {
  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "500ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-foreground font-semibold">Conversas Recentes</h3>
          <p className="text-sm text-muted-foreground">Últimas interações</p>
        </div>
        <button className="text-xs text-primary hover:underline">Ver todas</button>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa recente</p>
        ) : (
          data.map((c) => {
            const initials = c.nomeContato
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{c.nomeContato}</span>
                    <span className="text-xs text-muted-foreground">{c.tempo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.ultimaMensagem}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground capitalize">{c.canal}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyles[c.status] ?? ""}`}>
                    {statusLabels[c.status] ?? c.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
