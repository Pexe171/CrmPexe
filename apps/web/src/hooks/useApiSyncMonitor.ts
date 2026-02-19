import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";

type SyncStatus = "idle" | "syncing" | "success" | "error";

const DEFAULT_AUTO_SYNC_INTERVAL_MS = 30000;
const PROGRESS_STEP_MS = 250;
const PROGRESS_INCREMENT = 7;

type UseApiSyncMonitorOptions = {
  autoSyncIntervalMs?: number;
};

export function useApiSyncMonitor(options?: UseApiSyncMonitorOptions) {
  const autoSyncIntervalMs = options?.autoSyncIntervalMs ?? DEFAULT_AUTO_SYNC_INTERVAL_MS;

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastMessage, setLastMessage] = useState("Aguardando primeira sincronização.");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const [requestCount, setRequestCount] = useState(0);

  const isSyncingRef = useRef(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setStatus("syncing");
    setProgress(10);
    setLastMessage("Enviando requisição para a API...");

    progressTimerRef.current = setInterval(() => {
      setProgress((current) => (current >= 90 ? current : current + PROGRESS_INCREMENT));
    }, PROGRESS_STEP_MS);

    const startedAt = performance.now();

    try {
      const response = await dashboardApi.getSales();
      const durationMs = Math.round(performance.now() - startedAt);

      stopProgressTimer();
      setProgress(100);
      setStatus("success");
      setLastDurationMs(durationMs);
      setLastUpdatedAt(new Date());
      setRequestCount((current) => current + 1);
      setLastMessage(
        `Sincronização concluída. Conversas ativas: ${response.conversasAtivas}.`
      );
    } catch (error) {
      stopProgressTimer();
      setProgress(0);
      setStatus("error");
      setRequestCount((current) => current + 1);
      setLastMessage(
        `Falha ao sincronizar dados: ${error instanceof Error ? error.message : "erro desconhecido"}.`
      );
    } finally {
      isSyncingRef.current = false;

      setTimeout(() => {
        setProgress((current) => (current === 100 ? 0 : current));
      }, 800);
    }
  }, [stopProgressTimer]);

  useEffect(() => {
    syncNow();

    const intervalRef = setInterval(() => {
      syncNow();
    }, autoSyncIntervalMs);

    return () => {
      clearInterval(intervalRef);
      stopProgressTimer();
    };
  }, [autoSyncIntervalMs, stopProgressTimer, syncNow]);

  const isSyncing = status === "syncing";

  const statusLabel = useMemo(() => {
    if (status === "syncing") return "Sincronizando";
    if (status === "success") return "Atualizado";
    if (status === "error") return "Erro";
    return "Aguardando";
  }, [status]);

  return {
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
  };
}
