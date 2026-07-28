const sensitiveKey =
  /(email|phone|mobile|name|address|token|secret|password|authorization|cookie|message|body)/i;
const safePropertyKeys = new Set([
  "app_version",
  "count",
  "delta",
  "duration_ms",
  "environment",
  "feature",
  "metric",
  "navigation_type",
  "rating",
  "route",
  "source",
  "status",
  "value",
]);

export type SafeAnalyticsValue = string | number | boolean | null;

export function redactTelemetryText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(?:\+?966|0)?5\d{8}/g, "[redacted-phone]")
    .replace(/([?&](?:token|code|secret|key|email|phone)=)[^&#\s]+/gi, "$1[redacted]")
    .slice(0, 300);
}

export function normalizeAnalyticsRoute(pathname: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname.split(/[?#]/, 1)[0] || "/");
  } catch {
    return "/invalid-route";
  }
  if (decoded.startsWith("/property/")) return "/property/:id";
  if (decoded.startsWith("/roommates/")) return "/roommates/:id";
  if (decoded.startsWith("/city/")) return "/city/:id";
  const knownRoutes = new Set([
    "/",
    "/housing",
    "/roommates",
    "/admin",
    "/about",
    "/faq",
    "/support",
  ]);
  return knownRoutes.has(decoded) ? decoded : "/other";
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown> = {},
): Record<string, SafeAnalyticsValue> {
  const sanitized: Record<string, SafeAnalyticsValue> = {};
  for (const [key, value] of Object.entries(properties).slice(0, 20)) {
    if (!safePropertyKeys.has(key) || sensitiveKey.test(key)) continue;
    if (value === null || typeof value === "boolean") sanitized[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) sanitized[key] = value;
    else if (typeof value === "string") sanitized[key] = redactTelemetryText(value).slice(0, 120);
  }
  return sanitized;
}

export function sanitizeTelemetryUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${normalizeAnalyticsRoute(url.pathname)}`;
  } catch {
    return undefined;
  }
}

export function isAllowedAnalyticsEvent(name: string) {
  return new Set(["app_loaded", "app_error", "page_view", "web_vital", "feature_used"]).has(name);
}
