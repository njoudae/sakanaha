export type AnalyticsProperty = string | number | boolean | null;

const allowedEvents = new Set([
  "app_loaded",
  "feature_used",
  "page_view",
  "property_viewed",
  "roommate_viewed",
  "search_completed",
  "web_vital",
]);
const allowedProperties = new Set([
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
const sensitiveKey =
  /(email|phone|mobile|name|address|token|secret|password|authorization|cookie|message|body)/i;

function redactValue(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(?:\+?966|0)?5\d{8}/g, "[redacted-phone]")
    .slice(0, 160);
}

export function normalizeUsageEventName(value: string) {
  const normalized = value.trim();
  if (normalized.length > 80) throw new Error("Analytics event name is too long.");
  if (!allowedEvents.has(normalized)) throw new Error("Unsupported analytics event.");
  return normalized;
}

export function normalizeUsageRoute(value?: string) {
  if (value === undefined) return undefined;
  if (value.length > 512) throw new Error("Analytics route is too long.");
  const route = value.trim().split(/[?#]/, 1)[0];
  if (route.startsWith("/property/")) return "/property/:id";
  if (route.startsWith("/roommates/")) return "/roommates/:id";
  if (route.startsWith("/city/")) return "/city/:id";
  if (["/", "/housing", "/roommates", "/admin", "/about", "/faq", "/support"].includes(route)) {
    return route;
  }
  return "/other";
}

export function sanitizeUsageProperties(
  values: Record<string, AnalyticsProperty> = {},
): Record<string, AnalyticsProperty> {
  const entries = Object.entries(values);
  if (entries.length > 20) throw new Error("Too many analytics properties.");
  const sanitized: Record<string, AnalyticsProperty> = {};
  for (const [key, value] of entries) {
    if (!allowedProperties.has(key) || sensitiveKey.test(key)) continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    if (typeof value === "string" && value.length > 500) {
      throw new Error("Analytics property is too long.");
    }
    sanitized[key] = typeof value === "string" ? redactValue(value).slice(0, 120) : value;
  }
  return sanitized;
}

export function normalizeAuditAction(value: string) {
  const normalized = value.trim();
  if (!/^[a-z][a-z0-9_.-]{2,119}$/.test(normalized)) throw new Error("Invalid audit action.");
  return normalized;
}

export function sanitizeAuditMetadata(value: unknown) {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const sanitized: Record<string, AnalyticsProperty> = {};
  for (const [key, item] of Object.entries(value).slice(0, 30)) {
    if (sensitiveKey.test(key) || !/^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/.test(key)) continue;
    if (item === null || typeof item === "boolean") sanitized[key] = item;
    else if (typeof item === "number" && Number.isFinite(item)) sanitized[key] = item;
    else if (typeof item === "string") sanitized[key] = redactValue(item);
  }
  return sanitized;
}
