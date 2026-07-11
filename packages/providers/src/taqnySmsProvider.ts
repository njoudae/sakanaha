import type { SmsProvider } from "./messaging";
import {
  normalizeSmsStatus,
  postJson,
  smsBodyFromRequest,
  successfulSmsResult,
  type SmsProviderRuntime,
  type TaqnyCredentials,
} from "./smsSupport";

export function createTaqnySmsProvider(
  runtime: SmsProviderRuntime,
  credentials: TaqnyCredentials,
): SmsProvider {
  return {
    capability: "sms",
    provider: "taqny",
    sendSms: async (request) => {
      const data = (await postJson(
        runtime,
        "taqny",
        credentials.endpoint ?? "https://api.taqnyat.sa/v1/messages",
        {
          recipients: [request.toE164],
          body: smsBodyFromRequest(request),
          sender: credentials.sender,
        },
        {
          authorization: `Bearer ${credentials.bearerToken}`,
        },
      )) as {
        id?: string;
        messageId?: string;
        batchId?: string;
        status?: string;
        cost?: number;
        currency?: string;
      };

      return successfulSmsResult(
        normalizeSmsStatus(data.status),
        data.messageId ?? data.id ?? data.batchId,
        data.cost,
        data.currency,
      );
    },
  };
}
