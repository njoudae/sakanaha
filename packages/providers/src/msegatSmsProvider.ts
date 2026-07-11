import type { SmsProvider } from "./messaging";
import {
  normalizeSmsStatus,
  postJson,
  smsBodyFromRequest,
  successfulSmsResult,
  type MsegatCredentials,
  type SmsProviderRuntime,
} from "./smsSupport";

export function createMsegatSmsProvider(
  runtime: SmsProviderRuntime,
  credentials: MsegatCredentials,
): SmsProvider {
  return {
    capability: "sms",
    provider: "msegat",
    sendSms: async (request) => {
      const data = (await postJson(
        runtime,
        "msegat",
        credentials.endpoint ?? "https://www.msegat.com/gw/sendsms.php",
        {
          userName: credentials.username,
          apiKey: credentials.apiKey,
          numbers: request.toE164,
          userSender: credentials.sender,
          msg: smsBodyFromRequest(request),
        },
        {},
      )) as {
        id?: string;
        messageId?: string;
        code?: string;
        status?: string;
        cost?: number;
        currency?: string;
      };

      return successfulSmsResult(
        normalizeSmsStatus(data.status),
        data.messageId ?? data.id ?? data.code,
        data.cost,
        data.currency,
      );
    },
  };
}
