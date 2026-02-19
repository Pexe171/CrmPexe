import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useApiSyncMonitor } from "@/hooks/useApiSyncMonitor";
import { RefreshCcw } from "lucide-react";

export function ApiSyncStatus() {
  const { progress, isSyncing, lastMessage, lastUpdatedAt, syncNow } = useApiSyncMonitor();

  return (
    <div className="glass-card rounded-xl p-4 border border-border/50 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Sincronização da API</p>
          <p className="text-xs text-muted-foreground">
            {lastUpdatedAt
              ? `Última atualização em ${lastUpdatedAt.toLocaleTimeString("pt-BR")}`
              : "Ainda sem atualização concluída"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={syncNow}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCcw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Progress value={progress} className="h-2" />

      <p className="text-xs text-muted-foreground">{lastMessage}</p>
    </div>
  );
}
