function envBoolean(name: string, fallback = false) {
  const value = import.meta.env[name];
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function envNumber(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(import.meta.env[name]);
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

function envString(name: string) {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function secureEndpoint(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return undefined;
  }
  return undefined;
}

const sentryDsn = secureEndpoint(envString("VITE_SENTRY_DSN"));
const posthogHost = secureEndpoint(envString("VITE_POSTHOG_HOST"));
const posthogKey = envString("VITE_POSTHOG_KEY");

export const observabilityConfig = {
  environment: envString("VITE_APP_ENV") ?? import.meta.env.MODE,
  release: envString("VITE_APP_RELEASE"),
  sentry: {
    enabled: envBoolean("VITE_FEATURE_MONITORING_SENTRY_ENABLED") && sentryDsn !== undefined,
    dsn: sentryDsn,
    tracesSampleRate: envNumber("VITE_SENTRY_TRACES_SAMPLE_RATE", 0.1, 0, 1),
  },
  posthog: {
    enabled:
      envBoolean("VITE_FEATURE_ANALYTICS_POSTHOG_ENABLED") &&
      posthogHost !== undefined &&
      posthogKey !== undefined,
    host: posthogHost,
    key: posthogKey,
  },
  webVitals: {
    enabled: envBoolean("VITE_FEATURE_PERFORMANCE_WEB_VITALS_ENABLED", true),
    sampleRate: envNumber("VITE_WEB_VITALS_SAMPLE_RATE", 1, 0, 1),
  },
} as const;
