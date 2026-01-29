"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
  useMemo,
  useRef,
  useState
} from "react";

type FeedbackType = "error" | "success" | "info";

type FeedbackState = {
  message: string;
  type: FeedbackType;
};

type FeedbackContextValue = {
  feedback: FeedbackState | null;
  showFeedback: (message: string, type?: FeedbackType) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  clearFeedback: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneStyles: Record<FeedbackType, string> = {
  error: "border-rose-500/40 bg-rose-500/10 text-rose-100",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-100"
};

export function GlobalFeedbackProvider({
  children
}: {
  children: ReactNode;
}) {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const showFeedback = useCallback((message: string, type: FeedbackType = "info") => {
    setFeedback({ message, type });
  }, []);

  const showError = useCallback(
    (message: string) => showFeedback(message, "error"),
    [showFeedback]
  );

  const showSuccess = useCallback(
    (message: string) => showFeedback(message, "success"),
    [showFeedback]
  );

  const showInfo = useCallback(
    (message: string) => showFeedback(message, "info"),
    [showFeedback]
  );

  useEffect(() => {
    if (!feedback) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      timeoutRef.current = null;
    }, 6000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [feedback]);

  const value = useMemo(
    () => ({
      feedback,
      showFeedback,
      showError,
      showSuccess,
      showInfo,
      clearFeedback
    }),
    [feedback, showFeedback, showError, showSuccess, showInfo, clearFeedback]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {feedback ? (
        <div className="w-full border-b border-slate-800 px-6 py-3">
          <div
            className={`mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm ${toneStyles[feedback.type]}`}
          >
            <span>{feedback.message}</span>
            <button
              className="text-xs font-semibold uppercase tracking-wide text-slate-200/70 hover:text-white"
              onClick={clearFeedback}
              type="button"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </FeedbackContext.Provider>
  );
}

export function useGlobalFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useGlobalFeedback deve ser usado dentro de GlobalFeedbackProvider.");
  }

  return context;
}
