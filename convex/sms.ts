import {
  SmsProviderError,
  createMsegatSmsProvider,
  createProviderConfiguration,
  createTaqnySmsProvider,
  createTwilioSmsProvider,
  exponentialBackoffDelayMs,
  type ActiveSmsProviderName,
  type MessageSendResult,
  type SmsProvider,
  type SmsProviderConfig,
} from "@saknaha/providers";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const DEFAULT_OTP_TEMPLATE = "Your Saknaha verification code is {{code}}.";

function missingCredential(provider: ActiveSmsProviderName, name: string): never {
  throw new Error(`${provider} SMS credential ${name} is not configured.`);
}

function serverEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function createSmsProvider(provider: ActiveSmsProviderName): SmsProvider {
  const runtime = { fetch };
  switch (provider) {
    case "msegat":
      return createMsegatSmsProvider(runtime, {
        username: serverEnv("MSEGAT_USERNAME") ?? missingCredential(provider, "MSEGAT_USERNAME"),
        apiKey: serverEnv("MSEGAT_API_KEY") ?? missingCredential(provider, "MSEGAT_API_KEY"),
        sender: serverEnv("MSEGAT_SENDER") ?? missingCredential(provider, "MSEGAT_SENDER"),
        endpoint: serverEnv("MSEGAT_ENDPOINT"),
      });
    case "taqny":
      return createTaqnySmsProvider(runtime, {
        bearerToken:
          serverEnv("TAQNY_BEARER_TOKEN") ?? missingCredential(provider, "TAQNY_BEARER_TOKEN"),
        sender: serverEnv("TAQNY_SENDER") ?? missingCredential(provider, "TAQNY_SENDER"),
        endpoint: serverEnv("TAQNY_ENDPOINT"),
      });
    case "twilio":
      return createTwilioSmsProvider(runtime, {
        accountSid:
          serverEnv("TWILIO_ACCOUNT_SID") ?? missingCredential(provider, "TWILIO_ACCOUNT_SID"),
        authToken:
          serverEnv("TWILIO_AUTH_TOKEN") ?? missingCredential(provider, "TWILIO_AUTH_TOKEN"),
        from: serverEnv("TWILIO_FROM") ?? missingCredential(provider, "TWILIO_FROM"),
        endpoint: serverEnv("TWILIO_ENDPOINT"),
      });
    default:
      throw new Error("Unsupported SMS provider.");
  }
}

function smsProviderOrder(config: SmsProviderConfig): ActiveSmsProviderName[] {
  if (config.provider === "disabled") return [];
  const providers = [config.provider, ...config.fallbackProviders];
  return providers.filter(
    (provider, index): provider is ActiveSmsProviderName => providers.indexOf(provider) === index,
  );
}

function estimatedCostFor(
  config: SmsProviderConfig,
  provider: ActiveSmsProviderName,
  result?: MessageSendResult,
) {
  return result?.estimatedCost ?? config.estimatedCostByProvider[provider];
}

function currencyFor(config: SmsProviderConfig, result?: MessageSendResult) {
  return result?.currency ?? config.costCurrency;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sanitizeSmsError(error: unknown) {
  if (error instanceof SmsProviderError) {
    return `${error.provider}:${error.statusCode ?? "unknown"}:${
      error.temporary ? "temporary" : "permanent"
    }`;
  }
  return "sms_provider_error";
}

export const sendOtpSms = internalAction({
  args: {
    toE164: v.string(),
    destinationHash: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    idempotencyKey: v.string(),
    userId: v.optional(v.id("userProfiles")),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (process.env.AUTH_PHONE_OTP_ENABLED !== "true") {
      throw new Error("Phone OTP is disabled.");
    }

    const config = createProviderConfiguration(process.env).sms;
    if (config.emergencyKillSwitch) {
      throw new Error("SMS delivery is disabled by emergency kill switch.");
    }
    if (config.status !== "enabled" || config.provider === "disabled") {
      throw new Error("SMS delivery is disabled.");
    }

    const providerOrder = smsProviderOrder(config);
    if (providerOrder.length === 0) {
      throw new Error("No SMS provider is configured.");
    }

    const reserved = await ctx.runMutation(internal.smsState.reserveSmsMessage, {
      provider: providerOrder[0],
      userId: args.userId,
      purpose: "otp",
      toHash: args.destinationHash,
      bodyTemplate: "otp",
      idempotencyKey: args.idempotencyKey,
      expiresAt: args.expiresAt,
      hourlyLimit: config.hourlyLimit,
      dailyLimit: config.dailyLimit,
      perUserHourlyLimit: config.perUserHourlyLimit,
      perUserDailyLimit: config.perUserDailyLimit,
      ipHash: args.ipHash,
      perIpHourlyLimit: config.perIpHourlyLimit,
      perIpDailyLimit: config.perIpDailyLimit,
      destinationAccountHourlyLimit: config.destinationAccountHourlyLimit,
    });

    if (reserved.duplicate) {
      return {
        status: reserved.status,
        providerMessageId: reserved.providerMessageId,
        duplicate: true,
      };
    }

    let lastProvider = providerOrder[0];
    let lastError = "sms_provider_unavailable";
    for (const providerName of providerOrder) {
      lastProvider = providerName;
      const providerAvailable = await ctx.runQuery(internal.smsHealth.canUseProvider, {
        provider: providerName,
        operation: "otp_send",
        now: Date.now(),
      });
      if (!providerAvailable) {
        await ctx.runMutation(internal.smsHealth.recordProviderHealth, {
          provider: providerName,
          operation: "otp_send",
          responseTimeMs: 0,
          status: "skipped",
          deliveryStatus: "skipped",
          retryable: true,
          failureRateDisableThreshold: config.healthFailureRateDisableThreshold,
          minimumSampleSize: config.healthMinimumSampleSize,
          windowSize: config.healthWindowSize,
          cooldownMs: config.circuitBreakerCooldownMs,
        });
        continue;
      }

      const maxAttempts = Math.max(1, config.retryCount + 1);
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const now = Date.now();
        if (now >= args.expiresAt) {
          await ctx.runMutation(internal.smsState.markSmsFailed, {
            messageId: reserved.messageId,
            provider: providerName,
            attemptCount: attempt - 1,
            status: "expired",
            lastError: "otp_expired_before_delivery",
            estimatedCost: 0,
            currency: config.costCurrency,
          });
          return { status: "expired", duplicate: false };
        }

        await ctx.runMutation(internal.smsState.markSmsAttempt, {
          messageId: reserved.messageId,
          attemptCount: attempt,
        });

        const startedAt = Date.now();
        try {
          const provider = createSmsProvider(providerName);
          const result = await provider.sendSms({
            toE164: args.toE164,
            purpose: "otp",
            bodyTemplate: serverEnv("SAKNAHA_SMS_OTP_TEMPLATE") ?? DEFAULT_OTP_TEMPLATE,
            variables: { code: args.token },
            idempotencyKey: args.idempotencyKey,
          });
          const responseTimeMs = Date.now() - startedAt;
          const deliveryStatus = result.status === "skipped" ? "failed" : result.status;
          const estimatedCost = estimatedCostFor(config, providerName, result);
          const currency = currencyFor(config, result);

          await ctx.runMutation(internal.smsHealth.recordProviderHealth, {
            provider: providerName,
            operation: "otp_send",
            responseTimeMs,
            status:
              deliveryStatus === "failed" || deliveryStatus === "expired" ? "failure" : "success",
            deliveryStatus,
            retryable: deliveryStatus === "failed",
            failureRateDisableThreshold: config.healthFailureRateDisableThreshold,
            minimumSampleSize: config.healthMinimumSampleSize,
            windowSize: config.healthWindowSize,
            cooldownMs: config.circuitBreakerCooldownMs,
          });

          await ctx.runMutation(internal.smsState.markSmsSent, {
            messageId: reserved.messageId,
            provider: providerName,
            status: deliveryStatus,
            attemptCount: attempt,
            providerMessageId: result.providerMessageId,
            estimatedCost,
            currency,
          });

          return {
            status: deliveryStatus,
            providerMessageId: result.providerMessageId,
            duplicate: false,
          };
        } catch (error) {
          const responseTimeMs = Date.now() - startedAt;
          const temporary = error instanceof SmsProviderError && error.temporary;
          lastError = sanitizeSmsError(error);

          await ctx.runMutation(internal.smsHealth.recordProviderHealth, {
            provider: providerName,
            operation: "otp_send",
            responseTimeMs,
            status: "failure",
            deliveryStatus: "failed",
            retryable: temporary,
            failureRateDisableThreshold: config.healthFailureRateDisableThreshold,
            minimumSampleSize: config.healthMinimumSampleSize,
            windowSize: config.healthWindowSize,
            cooldownMs: config.circuitBreakerCooldownMs,
          });

          const shouldRetry = temporary && attempt < maxAttempts;

          if (!temporary) {
            await ctx.runMutation(internal.smsState.markSmsFailed, {
              messageId: reserved.messageId,
              provider: providerName,
              attemptCount: attempt,
              status: "failed",
              lastError,
              estimatedCost: 0,
              currency: config.costCurrency,
            });
            throw new Error("SMS delivery failed.", { cause: error });
          }

          if (!shouldRetry) {
            break;
          }

          const delayMs = exponentialBackoffDelayMs(
            attempt,
            config.retryBaseDelayMs,
            config.retryMaxDelayMs,
          );
          await ctx.runMutation(internal.smsState.markSmsAttempt, {
            messageId: reserved.messageId,
            attemptCount: attempt,
            nextAttemptAt: Date.now() + delayMs,
            lastError,
          });
          await sleep(delayMs);
        }
      }
    }

    if (Date.now() >= args.expiresAt) {
      await ctx.runMutation(internal.smsState.markSmsFailed, {
        messageId: reserved.messageId,
        provider: lastProvider,
        attemptCount: 0,
        status: "expired",
        lastError: "otp_expired_before_delivery",
        estimatedCost: 0,
        currency: config.costCurrency,
      });
      return { status: "expired", duplicate: false };
    }

    await ctx.runMutation(internal.smsState.markSmsFailed, {
      messageId: reserved.messageId,
      provider: lastProvider,
      attemptCount: Math.max(1, config.retryCount + 1),
      status: "failed",
      lastError,
      estimatedCost: 0,
      currency: config.costCurrency,
    });
    throw new Error("SMS delivery failed.");
  },
});
