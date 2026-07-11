import type {
  MessageSendResult,
  SmsDeliveryStatus,
  SmsProviderName,
  SmsSendRequest,
} from "./messaging";

export interface SmsFetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text?(): Promise<string>;
}

export type SmsFetchLike = (url: string, init?: RequestInit) => Promise<SmsFetchResponseLike>;

export interface SmsProviderRuntime {
  fetch: SmsFetchLike;
}

export class SmsProviderError extends Error {
  constructor(
    message: string,
    readonly provider: SmsProviderName,
    readonly temporary: boolean,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "SmsProviderError";
  }
}

export interface MsegatCredentials {
  username: string;
  apiKey: string;
  sender: string;
  endpoint?: string;
}

export interface TaqnyCredentials {
  bearerToken: string;
  sender: string;
  endpoint?: string;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  from: string;
  endpoint?: string;
}

export function renderSmsTemplate(template: string, variables: Record<string, string> = {}) {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, key: string) => variables[key] ?? "",
  );
}

export function exponentialBackoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
) {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
}

export function isTemporaryStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export function normalizeSmsStatus(status: string | undefined): SmsDeliveryStatus {
  const normalized = status?.toLowerCase();
  if (normalized === "delivered") return "delivered";
  if (normalized === "queued" || normalized === "accepted") return "queued";
  if (normalized === "sent" || normalized === "success" || normalized === "successfully sent") {
    return "sent";
  }
  if (normalized === "expired") return "expired";
  if (normalized === "failed" || normalized === "undelivered" || normalized === "rejected") {
    return "failed";
  }
  return "sent";
}

export async function postJson(
  runtime: SmsProviderRuntime,
  provider: SmsProviderName,
  url: string,
  body: unknown,
  headers: HeadersInit,
) {
  const response = await runtime.fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new SmsProviderError(
      `SMS provider returned HTTP ${response.status}.`,
      provider,
      isTemporaryStatus(response.status),
      response.status,
    );
  }

  return await response.json();
}

export function smsBodyFromRequest(request: SmsSendRequest) {
  return renderSmsTemplate(request.bodyTemplate, request.variables);
}

export function successfulSmsResult(
  status: SmsDeliveryStatus,
  providerMessageId?: string,
  estimatedCost?: number,
  currency?: string,
): MessageSendResult {
  return {
    status,
    providerMessageId,
    estimatedCost,
    currency,
  };
}
