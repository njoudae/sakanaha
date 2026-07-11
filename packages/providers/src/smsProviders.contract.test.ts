import { describe, expect, it } from "vitest";
import { createMsegatSmsProvider } from "./msegatSmsProvider";
import type { SmsProvider } from "./messaging";
import {
  SmsProviderError,
  exponentialBackoffDelayMs,
  type SmsFetchLike,
  type SmsFetchResponseLike,
} from "./smsSupport";
import { createTaqnySmsProvider } from "./taqnySmsProvider";
import { createTwilioSmsProvider } from "./twilioSmsProvider";

class JsonResponse implements SmsFetchResponseLike {
  constructor(
    private readonly body: unknown,
    readonly ok = true,
    readonly status = 200,
  ) {}

  async json() {
    return this.body;
  }
}

function fakeFetch(provider: SmsProvider["provider"]): SmsFetchLike {
  return async () => {
    if (provider === "msegat") {
      return new JsonResponse({
        id: "msegat-message-1",
        status: "sent",
        cost: 0.03,
        currency: "SAR",
      });
    }
    if (provider === "taqny") {
      return new JsonResponse({
        messageId: "taqny-message-1",
        status: "accepted",
        cost: 0.03,
        currency: "SAR",
      });
    }
    return new JsonResponse({
      sid: "twilio-message-1",
      status: "queued",
      price: "-0.0300",
      price_unit: "USD",
    });
  };
}

function providerFactories() {
  return [
    {
      name: "msegat",
      provider: createMsegatSmsProvider(
        { fetch: fakeFetch("msegat") },
        { username: "user", apiKey: "key", sender: "Saknaha", endpoint: "https://msegat.test" },
      ),
    },
    {
      name: "taqny",
      provider: createTaqnySmsProvider(
        { fetch: fakeFetch("taqny") },
        { bearerToken: "token", sender: "Saknaha", endpoint: "https://taqny.test" },
      ),
    },
    {
      name: "twilio",
      provider: createTwilioSmsProvider(
        { fetch: fakeFetch("twilio") },
        {
          accountSid: "account",
          authToken: "token",
          from: "+15555550100",
          endpoint: "https://twilio.test",
        },
      ),
    },
  ] as const;
}

describe("sms provider contract", () => {
  for (const factory of providerFactories()) {
    describe(factory.name, () => {
      it("normalizes send results and provider message ids", async () => {
        const result = await factory.provider.sendSms({
          toE164: "+966500000000",
          purpose: "otp",
          bodyTemplate: "Your code is {{code}}",
          variables: { code: "123456" },
          idempotencyKey: `${factory.name}-idempotency`,
        });

        expect(["queued", "sent", "delivered"]).toContain(result.status);
        expect(result.providerMessageId).toContain(`${factory.name}-message-1`);
        expect(result.estimatedCost).toBeGreaterThan(0);
        expect(result.currency).toBeTruthy();
      });
    });
  }

  it("marks 429 and 5xx provider failures as temporary", async () => {
    const provider = createMsegatSmsProvider(
      { fetch: async () => new JsonResponse({ error: "quota" }, false, 429) },
      { username: "user", apiKey: "key", sender: "Saknaha", endpoint: "https://msegat.test" },
    );

    await expect(
      provider.sendSms({
        toE164: "+966500000000",
        purpose: "otp",
        bodyTemplate: "Your code is {{code}}",
        variables: { code: "123456" },
        idempotencyKey: "temporary-failure",
      }),
    ).rejects.toMatchObject({
      provider: "msegat",
      temporary: true,
      statusCode: 429,
    } satisfies Partial<SmsProviderError>);
  });

  it("marks permanent provider failures as non-retryable", async () => {
    const provider = createTaqnySmsProvider(
      { fetch: async () => new JsonResponse({ error: "bad request" }, false, 400) },
      { bearerToken: "token", sender: "Saknaha", endpoint: "https://taqny.test" },
    );

    await expect(
      provider.sendSms({
        toE164: "+966500000000",
        purpose: "otp",
        bodyTemplate: "Your code is {{code}}",
        variables: { code: "123456" },
        idempotencyKey: "permanent-failure",
      }),
    ).rejects.toMatchObject({
      provider: "taqny",
      temporary: false,
      statusCode: 400,
    } satisfies Partial<SmsProviderError>);
  });

  it("uses bounded exponential backoff", () => {
    expect(exponentialBackoffDelayMs(1, 500, 30_000)).toBe(500);
    expect(exponentialBackoffDelayMs(2, 500, 30_000)).toBe(1000);
    expect(exponentialBackoffDelayMs(10, 500, 30_000)).toBe(30_000);
  });
});
