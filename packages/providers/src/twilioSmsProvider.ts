import type { SmsProvider } from "./messaging";
import {
  SmsProviderError,
  isTemporaryStatus,
  normalizeSmsStatus,
  smsBodyFromRequest,
  successfulSmsResult,
  type SmsProviderRuntime,
  type TwilioCredentials,
} from "./smsSupport";

function encodeBasicAuth(value: string) {
  return globalThis.btoa(value);
}

export function createTwilioSmsProvider(
  runtime: SmsProviderRuntime,
  credentials: TwilioCredentials,
): SmsProvider {
  return {
    capability: "sms",
    provider: "twilio",
    sendSms: async (request) => {
      const endpoint =
        credentials.endpoint ??
        `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: request.toE164,
        From: credentials.from,
        Body: smsBodyFromRequest(request),
      });
      const response = await runtime.fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Basic ${encodeBasicAuth(
            `${credentials.accountSid}:${credentials.authToken}`,
          )}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!response.ok) {
        throw new SmsProviderError(
          `SMS provider returned HTTP ${response.status}.`,
          "twilio",
          isTemporaryStatus(response.status),
          response.status,
        );
      }

      const data = (await response.json()) as {
        sid?: string;
        status?: string;
        price?: string | null;
        price_unit?: string | null;
      };
      const parsedCost =
        typeof data.price === "string" && data.price.trim()
          ? Math.abs(Number(data.price))
          : undefined;

      return successfulSmsResult(
        normalizeSmsStatus(data.status),
        data.sid,
        Number.isFinite(parsedCost) ? parsedCost : undefined,
        data.price_unit ?? undefined,
      );
    },
  };
}
