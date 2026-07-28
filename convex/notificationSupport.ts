export const DEFAULT_NOTIFICATION_CHANNELS = {
  inApp: true,
  email: true,
  sms: false,
  push: false,
} as const;

export const MAX_NOTIFICATION_ATTEMPTS = 5;
export const NOTIFICATION_BATCH_SIZE = 20;
export const NOTIFICATION_LEASE_MS = 2 * 60 * 1000;

const exactDeepLinks = new Set([
  "/",
  "/housing",
  "/roommates",
  "/admin",
  "/about",
  "/faq",
  "/support",
]);
const parameterizedDeepLinks = ["/city/", "/property/", "/roommates/"];

export interface QuietHoursValue {
  timezone: string;
  startMinutes: number;
  endMinutes: number;
}

export function normalizeNotificationDeepLink(value?: string) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > 512 ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    Array.from(trimmed).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    throw new Error("Invalid notification deep link.");
  }

  let decodedInput: string;
  try {
    decodedInput = decodeURIComponent(trimmed);
  } catch {
    throw new Error("Invalid notification deep link.");
  }
  if (decodedInput.split(/[?#]/, 1)[0].split("/").includes("..") || decodedInput.includes("\\")) {
    throw new Error("Invalid notification deep link.");
  }

  const url = new URL(trimmed, "https://saknaha.invalid");
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    throw new Error("Invalid notification deep link.");
  }
  if (decodedPath.includes("..") || decodedPath.includes("//")) {
    throw new Error("Invalid notification deep link.");
  }

  const allowed =
    exactDeepLinks.has(decodedPath) ||
    parameterizedDeepLinks.some((prefix) => {
      if (!decodedPath.startsWith(prefix)) return false;
      const identifier = decodedPath.slice(prefix.length);
      return identifier.length > 0 && identifier.length <= 160 && !identifier.includes("/");
    });
  if (!allowed) throw new Error("Unsupported notification deep link.");

  return `${url.pathname}${url.search}${url.hash}`;
}

export function validateNotificationContent(args: {
  type: string;
  title: string;
  body: string;
  idempotencyKey: string;
}) {
  const type = args.type.trim();
  const title = args.title.trim();
  const body = args.body.trim();
  const idempotencyKey = args.idempotencyKey.trim();
  if (!/^[a-z][a-z0-9_.-]{1,79}$/.test(type)) throw new Error("Invalid notification type.");
  if (title.length === 0 || title.length > 160) throw new Error("Invalid notification title.");
  if (body.length === 0 || body.length > 2_000) throw new Error("Invalid notification body.");
  if (idempotencyKey.length === 0 || idempotencyKey.length > 200) {
    throw new Error("Invalid notification idempotency key.");
  }
  return { type, title, body, idempotencyKey };
}

export function validateQuietHours(value?: QuietHoursValue) {
  if (value === undefined) return undefined;
  if (
    !Number.isInteger(value.startMinutes) ||
    !Number.isInteger(value.endMinutes) ||
    value.startMinutes < 0 ||
    value.startMinutes > 1439 ||
    value.endMinutes < 0 ||
    value.endMinutes > 1439 ||
    value.startMinutes === value.endMinutes
  ) {
    throw new Error("Invalid quiet hours.");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: value.timezone }).format(0);
  } catch {
    throw new Error("Invalid quiet-hours timezone.");
  }
  return value;
}

export function isWithinQuietHours(now: number, value?: QuietHoursValue) {
  if (value === undefined) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: value.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const localMinutes = hour * 60 + minute;
  return value.startMinutes < value.endMinutes
    ? localMinutes >= value.startMinutes && localMinutes < value.endMinutes
    : localMinutes >= value.startMinutes || localMinutes < value.endMinutes;
}

export function notificationRetryDelayMs(attemptCount: number) {
  const base = 60_000;
  return Math.min(6 * 60 * 60 * 1000, base * 2 ** Math.max(0, attemptCount - 1));
}

export function notificationExternalUrl(appUrl: string | undefined, deepLink?: string) {
  if (!appUrl || !deepLink) return undefined;
  const base = new URL(appUrl);
  if (
    base.protocol !== "https:" &&
    base.hostname !== "localhost" &&
    base.hostname !== "127.0.0.1"
  ) {
    throw new Error("Notification application URL must use HTTPS.");
  }
  const normalizedDeepLink = normalizeNotificationDeepLink(deepLink);
  if (normalizedDeepLink === undefined) return undefined;
  return new URL(normalizedDeepLink, base).toString();
}
