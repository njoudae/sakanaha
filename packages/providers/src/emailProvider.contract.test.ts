import { describe, expect, it, vi } from "vitest";
import { createWebhookEmailProvider } from "./webhookEmailProvider";
import { EmailProviderError } from "./emailSupport";

describe("webhook email provider", () => {
  it("sends a rendered, idempotent notification payload", async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      status: 202,
      json: async () => ({ messageId: "email-1", status: "accepted" }),
    }));
    const provider = createWebhookEmailProvider(
      { fetch },
      {
        endpoint: "https://email.example.test/send",
        secret: "secret",
      },
    );

    const result = await provider.sendEmail({
      to: "user@example.test",
      subject: "Update",
      template: "Hello {{name}}",
      variables: { name: "Noura" },
      idempotencyKey: "notification:1:email",
    });

    expect(result).toEqual({ providerMessageId: "email-1", status: "sent" });
    expect(fetch).toHaveBeenCalledWith(
      "https://email.example.test/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer secret",
          "idempotency-key": "notification:1:email",
        }),
        body: JSON.stringify({
          to: "user@example.test",
          subject: "Update",
          body: "Hello Noura",
          idempotencyKey: "notification:1:email",
        }),
      }),
    );
  });

  it("classifies retryable and permanent provider failures", async () => {
    const temporary = createWebhookEmailProvider(
      { fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }) },
      { endpoint: "https://email.example.test/send" },
    );
    const permanent = createWebhookEmailProvider(
      { fetch: async () => ({ ok: false, status: 400, json: async () => ({}) }) },
      { endpoint: "https://email.example.test/send" },
    );

    await expect(
      temporary.sendEmail({
        to: "user@example.test",
        subject: "Update",
        template: "Body",
        idempotencyKey: "a",
      }),
    ).rejects.toMatchObject({ temporary: true, statusCode: 503 });
    await expect(
      permanent.sendEmail({
        to: "user@example.test",
        subject: "Update",
        template: "Body",
        idempotencyKey: "b",
      }),
    ).rejects.toMatchObject({ temporary: false, statusCode: 400 });
    expect(EmailProviderError).toBeDefined();
  });

  it("rejects insecure webhook destinations before sending private notification data", async () => {
    const fetch = vi.fn();
    const provider = createWebhookEmailProvider(
      { fetch },
      { endpoint: "http://169.254.169.254/latest/meta-data" },
    );

    await expect(
      provider.sendEmail({
        to: "user@example.test",
        subject: "Update",
        template: "Body",
        idempotencyKey: "unsafe",
      }),
    ).rejects.toThrow("must use HTTPS");
    expect(fetch).not.toHaveBeenCalled();
  });
});
