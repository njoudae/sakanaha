import type { ProviderAdapterBase, ProviderConfig, ProviderUsageContext } from "./providerTypes";

export type SmsProviderName = "msegat" | "taqny" | "twilio" | "disabled";
export type ActiveSmsProviderName = Exclude<SmsProviderName, "disabled">;
export type EmailProviderName = "webhook" | "resend" | "disabled";
export type PushProviderName = "webpush" | "firebase" | "disabled";
export type SmsDeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "expired" | "skipped";

export interface MessageSendResult {
  providerMessageId?: string;
  status: SmsDeliveryStatus;
  estimatedCost?: number;
  currency?: string;
  temporaryFailure?: boolean;
}

export interface SmsSendRequest {
  toE164: string;
  purpose: "otp" | "notification" | "support";
  bodyTemplate: string;
  variables?: Record<string, string>;
  idempotencyKey: string;
  context?: ProviderUsageContext;
}

export interface EmailSendRequest {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, string>;
  idempotencyKey: string;
  context?: ProviderUsageContext;
}

export interface PushSendRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  idempotencyKey: string;
  context?: ProviderUsageContext;
}

export interface SmsProvider extends ProviderAdapterBase<SmsProviderName> {
  sendSms(request: SmsSendRequest): Promise<MessageSendResult>;
}

export interface EmailProvider extends ProviderAdapterBase<EmailProviderName> {
  sendEmail(request: EmailSendRequest): Promise<MessageSendResult>;
}

export interface PushProvider extends ProviderAdapterBase<PushProviderName> {
  sendPush(request: PushSendRequest): Promise<MessageSendResult>;
}

export type SmsProviderConfig = ProviderConfig<SmsProviderName> & {
  emergencyKillSwitch: boolean;
  fallbackProviders: ActiveSmsProviderName[];
  retryCount: number;
  otpTtlSeconds: number;
  hourlyLimit: number;
  dailyLimit: number;
  perUserHourlyLimit: number;
  perUserDailyLimit: number;
  perIpHourlyLimit: number;
  perIpDailyLimit: number;
  destinationAccountHourlyLimit: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  healthFailureRateDisableThreshold: number;
  healthMinimumSampleSize: number;
  healthWindowSize: number;
  circuitBreakerCooldownMs: number;
  estimatedCostByProvider: Partial<Record<ActiveSmsProviderName, number>>;
  costCurrency: string;
};

export type EmailProviderConfig = ProviderConfig<EmailProviderName>;

export type PushProviderConfig = ProviderConfig<PushProviderName>;
