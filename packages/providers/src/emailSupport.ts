import type { EmailProviderName, EmailSendRequest, MessageSendResult } from "./messaging";

export interface EmailFetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type EmailFetchLike = (url: string, init?: RequestInit) => Promise<EmailFetchResponseLike>;

export interface EmailProviderRuntime {
  fetch: EmailFetchLike;
}

export interface WebhookEmailCredentials {
  endpoint: string;
  secret?: string;
}

export class EmailProviderError extends Error {
  constructor(
    message: string,
    readonly provider: EmailProviderName,
    readonly temporary: boolean,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "EmailProviderError";
  }
}

export function renderEmailTemplate(template: string, variables: Record<string, string> = {}) {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, key: string) => variables[key] ?? "",
  );
}

export function emailPayload(request: EmailSendRequest) {
  return {
    to: request.to,
    subject: request.subject,
    body: renderEmailTemplate(request.template, request.variables),
    idempotencyKey: request.idempotencyKey,
  };
}

export function emailResultFromResponse(value: unknown): MessageSendResult {
  const data = value as { id?: unknown; messageId?: unknown; status?: unknown };
  return {
    providerMessageId:
      typeof data.messageId === "string"
        ? data.messageId
        : typeof data.id === "string"
          ? data.id
          : undefined,
    status: data.status === "delivered" ? "delivered" : "sent",
  };
}
