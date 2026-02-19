import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useApiSyncMonitor } from "@/hooks/useApiSyncMonitor";
import { CheckCircle2, Clock3, RefreshCcw, ShieldAlert } from "lucide-react";

function statusClasses(status: "idle" | "syncing" | "success" | "error") {
  if (status === "success") {
    return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  }

  if (status === "error") {
    return "bg-destructive/10 text-destructive border-destructive/30";
  }

  if (status === "syncing") {
    return "bg-primary/10 text-primary border-primary/30";
  }

  return "bg-muted text-muted-foreground border-border";
}

export function ApiSyncStatus() {
  const {
    progress,
    status,
    statusLabel,
    isSyncing,
    lastMessage,
    lastUpdatedAt,
    lastDurationMs,
    requestCount,
    autoSyncIntervalMs,
    syncNow
  } = useApiSyncMonitor();

  const autoSyncIntervalInSeconds = Math.floor(autoSyncIntervalMs / 1000);

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/70 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Monitor de sincronização</p>
          <p className="text-xs text-muted-foreground">
            Atualização automática a cada {autoSyncIntervalInSeconds}s com feedback em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(status)}`}
          >
            {status === "success" && <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
            {status === "error" && <ShieldAlert className="mr-1 h-3.5 w-3.5" />}
            {status === "syncing" && <Clock3 className="mr-1 h-3.5 w-3.5" />}
            {statusLabel}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={syncNow}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Sincronizar agora
          </Button>
        </div>
      </div>

      <Progress value={progress} className="h-2.5" />

      <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-3">
        <p>
          <span className="font-medium text-foreground">Última atualização:</span>{" "}
          {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString("pt-BR") : "ainda não concluída"}
        </p>
        <p>
          <span className="font-medium text-foreground">Tempo de resposta:</span>{" "}
          {lastDurationMs != null ? `${lastDurationMs}ms` : "sem medição"}
        </p>
        <p>
          <span className="font-medium text-foreground">Requisições monitoradas:</span> {requestCount}
        </p>
      </div>

      <p className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {lastMessage}
      </p>
    </section>
  );
}
