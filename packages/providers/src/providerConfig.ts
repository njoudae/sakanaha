import type { MapsProviderConfig, MapsProviderName } from "./maps";
import type {
  ActiveSmsProviderName,
  EmailProviderConfig,
  EmailProviderName,
  PushProviderConfig,
  PushProviderName,
  SmsProviderConfig,
  SmsProviderName,
} from "./messaging";
import type {
  AnalyticsProviderConfig,
  AnalyticsProviderName,
  CostProviderConfig,
  CostProviderName,
  MonitoringProviderConfig,
  MonitoringProviderName,
} from "./observability";
import type { StorageProviderConfig, StorageProviderName } from "./storage";

export interface ProviderEnvironment {
  readonly [key: string]: string | boolean | number | undefined;
}

export interface ProviderConfiguration {
  maps: MapsProviderConfig;
  sms: SmsProviderConfig;
  email: EmailProviderConfig;
  push: PushProviderConfig;
  analytics: AnalyticsProviderConfig;
  monitoring: MonitoringProviderConfig;
  storage: StorageProviderConfig;
  cost: CostProviderConfig;
}

const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

function envString(env: ProviderEnvironment, key: string): string | undefined {
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function envBoolean(env: ProviderEnvironment, key: string, fallback = false): boolean {
  const value = env[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function envNumber(env: ProviderEnvironment, key: string, fallback: number): number {
  const value = env[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function envStringList(env: ProviderEnvironment, key: string): string[] | undefined {
  const value = envString(env, key);
  if (value === undefined) return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function providerStatus(provider: string) {
  return provider === "disabled" ? "disabled" : "enabled";
}

function smsFallbackProviders(
  env: ProviderEnvironment,
  primary: SmsProviderName,
): ActiveSmsProviderName[] {
  const configured = envStringList(env, "SAKNAHA_SMS_FALLBACK_PROVIDERS");
  const fallbacks = (configured ?? ["taqny", "twilio"]).filter(
    (provider): provider is ActiveSmsProviderName =>
      provider === "msegat" || provider === "taqny" || provider === "twilio",
  );
  return fallbacks.filter((provider) => provider !== primary);
}

export function createProviderConfiguration(env: ProviderEnvironment = {}): ProviderConfiguration {
  const mapsProvider = (envString(env, "SAKNAHA_MAPS_PROVIDER") ?? "google") as MapsProviderName;
  const smsProvider = (envString(env, "SAKNAHA_SMS_PROVIDER") ?? "msegat") as SmsProviderName;
  const smsEmergencyKillSwitch = envBoolean(env, "SAKNAHA_SMS_EMERGENCY_DISABLED");
  const emailProvider = (envString(env, "SAKNAHA_EMAIL_PROVIDER") ??
    "webhook") as EmailProviderName;
  const pushProvider = (envString(env, "SAKNAHA_PUSH_PROVIDER") ?? "disabled") as PushProviderName;
  const analyticsProvider = (envString(env, "SAKNAHA_ANALYTICS_PROVIDER") ??
    "disabled") as AnalyticsProviderName;
  const monitoringProvider = (envString(env, "SAKNAHA_MONITORING_PROVIDER") ??
    "disabled") as MonitoringProviderName;
  const storageProvider = (envString(env, "SAKNAHA_STORAGE_PROVIDER") ??
    "convex") as StorageProviderName;
  const costProvider = (envString(env, "SAKNAHA_COST_PROVIDER") ?? "convex") as CostProviderName;

  return {
    maps: {
      provider: mapsProvider,
      status: providerStatus(mapsProvider),
      paidCallsEnabled: envBoolean(env, "SAKNAHA_MAPS_PAID_CALLS_ENABLED"),
      cacheTtlSeconds: envNumber(env, "SAKNAHA_MAPS_CACHE_TTL_SECONDS", 60 * 60 * 24 * 30),
      quotaPerMinute: envNumber(env, "SAKNAHA_MAPS_QUOTA_PER_MINUTE", 60),
      fallbackProviders: ["mapbox", "openstreetmap"],
      circuitBreakerFailureThreshold: envNumber(
        env,
        "SAKNAHA_MAPS_CIRCUIT_BREAKER_FAILURE_THRESHOLD",
        3,
      ),
      circuitBreakerCooldownMs: envNumber(
        env,
        "SAKNAHA_MAPS_CIRCUIT_BREAKER_COOLDOWN_MS",
        5 * 60 * 1000,
      ),
    },
    sms: {
      provider: smsProvider,
      status:
        envBoolean(env, "SAKNAHA_SMS_ENABLED") && !smsEmergencyKillSwitch
          ? providerStatus(smsProvider)
          : "disabled",
      emergencyKillSwitch: smsEmergencyKillSwitch,
      fallbackProviders: smsFallbackProviders(env, smsProvider),
      retryCount: envNumber(env, "SAKNAHA_SMS_RETRY_COUNT", 3),
      otpTtlSeconds: envNumber(env, "SAKNAHA_SMS_OTP_TTL_SECONDS", 10 * 60),
      hourlyLimit: envNumber(env, "SAKNAHA_SMS_HOURLY_LIMIT", 100),
      dailyLimit: envNumber(env, "SAKNAHA_SMS_DAILY_LIMIT", 500),
      perUserHourlyLimit: envNumber(env, "SAKNAHA_SMS_PER_USER_HOURLY_LIMIT", 5),
      perUserDailyLimit: envNumber(env, "SAKNAHA_SMS_PER_USER_DAILY_LIMIT", 20),
      perIpHourlyLimit: envNumber(env, "SAKNAHA_SMS_PER_IP_HOURLY_LIMIT", 20),
      perIpDailyLimit: envNumber(env, "SAKNAHA_SMS_PER_IP_DAILY_LIMIT", 100),
      destinationAccountHourlyLimit: envNumber(
        env,
        "SAKNAHA_SMS_DESTINATION_ACCOUNT_HOURLY_LIMIT",
        3,
      ),
      retryBaseDelayMs: envNumber(env, "SAKNAHA_SMS_RETRY_BASE_DELAY_MS", 500),
      retryMaxDelayMs: envNumber(env, "SAKNAHA_SMS_RETRY_MAX_DELAY_MS", 30_000),
      healthFailureRateDisableThreshold: envNumber(
        env,
        "SAKNAHA_SMS_FAILURE_RATE_DISABLE_THRESHOLD",
        0.5,
      ),
      healthMinimumSampleSize: envNumber(env, "SAKNAHA_SMS_HEALTH_MINIMUM_SAMPLE_SIZE", 5),
      healthWindowSize: envNumber(env, "SAKNAHA_SMS_HEALTH_WINDOW_SIZE", 50),
      circuitBreakerCooldownMs: envNumber(
        env,
        "SAKNAHA_SMS_CIRCUIT_BREAKER_COOLDOWN_MS",
        5 * 60 * 1000,
      ),
      estimatedCostByProvider: {
        msegat: envNumber(env, "SAKNAHA_SMS_MSEGAT_ESTIMATED_COST", 0.03),
        taqny: envNumber(env, "SAKNAHA_SMS_TAQNY_ESTIMATED_COST", 0.03),
        twilio: envNumber(env, "SAKNAHA_SMS_TWILIO_ESTIMATED_COST", 0.04),
      },
      costCurrency: envString(env, "SAKNAHA_SMS_COST_CURRENCY") ?? "SAR",
    },
    email: {
      provider: emailProvider,
      status: providerStatus(emailProvider),
    },
    push: {
      provider: pushProvider,
      status: providerStatus(pushProvider),
    },
    analytics: {
      provider: analyticsProvider,
      status: providerStatus(analyticsProvider),
    },
    monitoring: {
      provider: monitoringProvider,
      status: providerStatus(monitoringProvider),
    },
    storage: {
      provider: storageProvider,
      status: providerStatus(storageProvider),
      maxUploadBytes: envNumber(env, "SAKNAHA_STORAGE_MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
      allowedMimeTypes: imageMimeTypes,
    },
    cost: {
      provider: costProvider,
      status: providerStatus(costProvider),
    },
  };
}
