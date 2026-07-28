import {
  EmailProviderError,
  SmsProviderError,
  createMsegatSmsProvider,
  createProviderConfiguration,
  createTaqnySmsProvider,
  createTwilioSmsProvider,
  createWebhookEmailProvider,
  type ActiveSmsProviderName,
  type MessageSendResult,
  type SmsProvider,
} from "@saknaha/providers";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { isWithinQuietHours, notificationExternalUrl } from "./notificationSupport";

function serverEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredEnv(name: string) {
  const value = serverEnv(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function createSmsProvider(provider: ActiveSmsProviderName): SmsProvider {
  const runtime = { fetch };
  if (provider === "msegat") {
    return createMsegatSmsProvider(runtime, {
      username: requiredEnv("MSEGAT_USERNAME"),
      apiKey: requiredEnv("MSEGAT_API_KEY"),
      sender: requiredEnv("MSEGAT_SENDER"),
      endpoint: serverEnv("MSEGAT_ENDPOINT"),
    });
  }
  if (provider === "taqny") {
    return createTaqnySmsProvider(runtime, {
      bearerToken: requiredEnv("TAQNY_BEARER_TOKEN"),
      sender: requiredEnv("TAQNY_SENDER"),
      endpoint: serverEnv("TAQNY_ENDPOINT"),
    });
  }
  return createTwilioSmsProvider(runtime, {
    accountSid: requiredEnv("TWILIO_ACCOUNT_SID"),
    authToken: requiredEnv("TWILIO_AUTH_TOKEN"),
    from: requiredEnv("TWILIO_FROM"),
    endpoint: serverEnv("TWILIO_ENDPOINT"),
  });
}

function smsProviderOrder() {
  const config = createProviderConfiguration(process.env).sms;
  if (config.status !== "enabled" || config.provider === "disabled" || config.emergencyKillSwitch) {
    throw new Error("sms_disabled");
  }
  return [config.provider, ...config.fallbackProviders].filter(
    (provider, index, providers): provider is ActiveSmsProviderName =>
      providers.indexOf(provider) === index,
  );
}

async function sendEmail(args: {
  destination: string;
  title: string;
  body: string;
  link?: string;
  idempotencyKey: string;
}) {
  const config = createProviderConfiguration(process.env).email;
  if (config.status !== "enabled" || config.provider === "disabled")
    throw new Error("email_disabled");
  if (config.provider !== "webhook") throw new Error("email_provider_unsupported");
  const provider = createWebhookEmailProvider(
    { fetch },
    {
      endpoint: requiredEnv("SAKNAHA_EMAIL_WEBHOOK_URL"),
      secret: requiredEnv("SAKNAHA_EMAIL_WEBHOOK_SECRET"),
    },
  );
  const result = await provider.sendEmail({
    to: args.destination,
    subject: args.title,
    template: "{{body}}{{link}}",
    variables: { body: args.body, link: args.link ? `\n\n${args.link}` : "" },
    idempotencyKey: args.idempotencyKey,
  });
  return { provider: provider.provider, result };
}

async function sendSms(args: {
  destination: string;
  body: string;
  link?: string;
  idempotencyKey: string;
}) {
  const providers = smsProviderOrder();
  let lastError: unknown = new Error("sms_provider_unavailable");
  for (const providerName of providers) {
    try {
      const provider = createSmsProvider(providerName);
      const result = await provider.sendSms({
        toE164: args.destination,
        purpose: "notification",
        bodyTemplate: "{{body}}{{link}}",
        variables: { body: args.body, link: args.link ? `\n${args.link}` : "" },
        idempotencyKey: args.idempotencyKey,
      });
      if (
        result.status === "failed" ||
        result.status === "expired" ||
        result.status === "skipped"
      ) {
        throw new SmsProviderError("SMS notification was rejected.", providerName, true);
      }
      return { provider: providerName, result };
    } catch (error) {
      lastError = error;
      if (error instanceof SmsProviderError && !error.temporary) throw error;
    }
  }
  throw lastError;
}

function deliveryError(error: unknown) {
  if (error instanceof EmailProviderError || error instanceof SmsProviderError) {
    return {
      code: `${error.provider}:${error.statusCode ?? "provider_error"}`,
      temporary: error.temporary,
      provider: error.provider,
    };
  }
  const code =
    error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "provider_error";
  return { code, temporary: true, provider: undefined };
}

export const processDue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; considered: number }> => {
    const now = Date.now();
    const deliveryIds: Id<"notificationDeliveries">[] = await ctx.runQuery(
      internal.notificationState.due,
      { now },
    );
    let processed = 0;
    for (const deliveryId of deliveryIds) {
      const claimed = await ctx.runMutation(internal.notificationState.claim, {
        deliveryId,
        now: Date.now(),
      });
      if (claimed === null) continue;
      const context = await ctx.runQuery(internal.notificationState.context, { deliveryId });
      if (context === null || context.destination === undefined) {
        await ctx.runMutation(internal.notificationState.failOrRetry, {
          deliveryId,
          errorCode: "destination_missing",
          temporary: false,
        });
        continue;
      }
      if (isWithinQuietHours(Date.now(), context.quietHours)) {
        await ctx.runMutation(internal.notificationState.releaseForQuietHours, {
          deliveryId,
          nextAttemptAt: Date.now() + 15 * 60 * 1000,
        });
        continue;
      }

      try {
        const link = notificationExternalUrl(
          serverEnv("SAKNAHA_APP_URL"),
          context.notification.deepLink,
        );
        const sent: { provider: string; result: MessageSendResult } =
          claimed.channel === "email"
            ? await sendEmail({
                destination: context.destination,
                title: context.notification.title,
                body: context.notification.body,
                link,
                idempotencyKey: claimed.idempotencyKey ?? `${claimed.notificationId}:email`,
              })
            : await sendSms({
                destination: context.destination,
                body: `${context.notification.title}\n${context.notification.body}`,
                link,
                idempotencyKey: claimed.idempotencyKey ?? `${claimed.notificationId}:sms`,
              });
        await ctx.runMutation(internal.notificationState.complete, {
          deliveryId,
          provider: sent.provider,
          providerMessageId: sent.result.providerMessageId,
        });
        processed += 1;
      } catch (error) {
        const failure = deliveryError(error);
        await ctx.runMutation(internal.notificationState.failOrRetry, {
          deliveryId,
          provider: failure.provider,
          errorCode: failure.code,
          temporary: failure.temporary,
        });
      }
    }
    return { processed, considered: deliveryIds.length };
  },
});
