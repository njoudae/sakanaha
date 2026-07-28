import type { MonitoringProvider } from "@saknaha/providers";
import { observabilityConfig } from "./config";
import { redactTelemetryText, sanitizeTelemetryUrl } from "./privacy";

type SentryModule = typeof import("@sentry/react");
let sentryModule: Promise<SentryModule | null> | null = null;

function loadSentry() {
  if (!observabilityConfig.sentry.enabled || !observabilityConfig.sentry.dsn) {
    return Promise.resolve(null);
  }
  sentryModule ??= import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: observabilityConfig.sentry.dsn,
      enabled: true,
      environment: observabilityConfig.environment,
      release: observabilityConfig.release,
      sendDefaultPii: false,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: observabilityConfig.sentry.tracesSampleRate,
      tracePropagationTargets: [/^\//],
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend(event) {
        event.user = undefined;
        event.extra = undefined;
        if (event.message) event.message = redactTelemetryText(event.message);
        for (const exception of event.exception?.values ?? []) {
          if (exception.value) exception.value = redactTelemetryText(exception.value);
        }
        if (event.request) {
          event.request = {
            method: event.request.method,
            url: sanitizeTelemetryUrl(event.request.url),
          };
        }
        event.breadcrumbs = event.breadcrumbs?.slice(-30).map((breadcrumb) => ({
          category: breadcrumb.category,
          level: breadcrumb.level,
          message: breadcrumb.message ? redactTelemetryText(breadcrumb.message) : undefined,
          timestamp: breadcrumb.timestamp,
          type: breadcrumb.type,
        }));
        return event;
      },
      beforeSendTransaction(event) {
        event.user = undefined;
        if (event.transaction?.startsWith("/")) {
          event.transaction = sanitizeTelemetryUrl(event.transaction)?.replace(
            window.location.origin,
            "",
          );
        }
        if (event.request) {
          event.request = {
            method: event.request.method,
            url: sanitizeTelemetryUrl(event.request.url),
          };
        }
        return event;
      },
    });
    return Sentry;
  });
  return sentryModule;
}

export async function initializeMonitoring() {
  await loadSentry();
}

export const sentryMonitoringProvider: MonitoringProvider = {
  capability: "monitoring",
  provider: "sentry",
  async capture(event) {
    const Sentry = await loadSentry();
    if (!Sentry) return;
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(event.tags ?? {}).slice(0, 20)) {
        scope.setTag(key.slice(0, 40), redactTelemetryText(value).slice(0, 120));
      }
      if (event.fingerprint) scope.setFingerprint([event.fingerprint.slice(0, 120)]);
      Sentry.captureMessage(redactTelemetryText(event.message), event.level);
    });
  },
};

export function captureApplicationError(error: unknown, source: string) {
  void loadSentry()
    .then((Sentry) => {
      if (!Sentry) return;
      Sentry.withScope((scope) => {
        scope.setTag("source", source.slice(0, 80));
        Sentry.captureException(error instanceof Error ? error : new Error("Non-error exception"));
      });
    })
    .catch(() => undefined);
}

export function addPerformanceBreadcrumb(metric: string, value: number, rating: string) {
  void loadSentry()
    .then((Sentry) => {
      if (!Sentry) return;
      Sentry.addBreadcrumb({
        category: "web-vital",
        level: rating === "poor" ? "warning" : "info",
        message: metric,
        data: { value: Math.round(value * 1000) / 1000, rating },
      });
    })
    .catch(() => undefined);
}
