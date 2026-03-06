import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN?.trim();
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim();
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://app.posthog.com";

export function initMonitoring() {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE ?? "development",
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1
    });
  }

  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only"
    });
  }
}

export function capturePostHogEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof posthog?.capture === "function") {
    posthog.capture(name, properties);
  }
}

export { Sentry, posthog };
