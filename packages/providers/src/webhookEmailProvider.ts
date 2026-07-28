import type { EmailProvider } from "./messaging";
import {
  EmailProviderError,
  emailPayload,
  emailResultFromResponse,
  type EmailProviderRuntime,
  type WebhookEmailCredentials,
} from "./emailSupport";
import { isTemporaryStatus } from "./smsSupport";
import { assertSecureProviderEndpoint } from "./providerSecurity";

export function createWebhookEmailProvider(
  runtime: EmailProviderRuntime,
  credentials: WebhookEmailCredentials,
): EmailProvider {
  return {
    capability: "email",
    provider: "webhook",
    sendEmail: async (request) => {
      const response = await runtime.fetch(
        assertSecureProviderEndpoint(credentials.endpoint, "Email webhook endpoint"),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": request.idempotencyKey,
            ...(credentials.secret ? { authorization: `Bearer ${credentials.secret}` } : {}),
          },
          body: JSON.stringify(emailPayload(request)),
        },
      );

      if (!response.ok) {
        throw new EmailProviderError(
          `Email provider returned HTTP ${response.status}.`,
          "webhook",
          isTemporaryStatus(response.status),
          response.status,
        );
      }

      return emailResultFromResponse(await response.json());
    },
  };
}
