import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";

const PROGRESS_STEP_MS = 250;

export function useApiSyncMonitor() {
  const [progress, setProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastMessage, setLastMessage] = useState("Aguardando primeira sincronização.");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopProgressTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setProgress(10);
    setLastMessage("Enviando requisição para a API...");

    timerRef.current = setInterval(() => {
      setProgress((current) => (current >= 90 ? current : current + 8));
    }, PROGRESS_STEP_MS);

    try {
      const response = await dashboardApi.getSales();
      stopProgressTimer();
      setProgress(100);
      setLastUpdatedAt(new Date());
      setLastMessage(
        `Sincronização concluída com sucesso. Conversas ativas: ${response.conversasAtivas}.`
      );
    } catch (error) {
      stopProgressTimer();
      setProgress(0);
      setLastMessage(
        `Falha ao sincronizar dados: ${error instanceof Error ? error.message : "erro desconhecido"}.`
      );
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setProgress((current) => (current === 100 ? 0 : current));
      }, 800);
    }
  }, [isSyncing, stopProgressTimer]);

  useEffect(() => {
    syncNow();

    const interval = setInterval(() => {
      syncNow();
    }, 30000);

    return () => {
      clearInterval(interval);
      stopProgressTimer();
    };
  }, [syncNow, stopProgressTimer]);

  return {
    progress,
    isSyncing,
    lastMessage,
    lastUpdatedAt,
    syncNow
  };
}
