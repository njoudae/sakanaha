import { Email } from "@convex-dev/auth/providers/Email";
import { Phone } from "@convex-dev/auth/providers/Phone";
import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { internal } from "./_generated/api";

const EMAIL_OTP_MAX_AGE_SECONDS = 15 * 60;
const PHONE_OTP_MAX_AGE_SECONDS = 10 * 60;
const SESSION_TOTAL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_INACTIVE_MS = 7 * 24 * 60 * 60 * 1000;
const JWT_DURATION_MS = 60 * 60 * 1000;

function generateNumericOtp(length = 8) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => String(value % 10)).join("");
}

function normalizeEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Invalid email address.");
  }
  return normalized;
}

function normalizePhone(identifier: string) {
  const normalized = identifier.replace(/[^\d+]/g, "");
  if (!/^\+?\d{8,15}$/.test(normalized)) {
    throw new Error("Invalid phone number.");
  }
  return normalized;
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function postOtpToWebhook(args: {
  url: string;
  secret?: string;
  channel: "email" | "sms";
  destination: string;
  token: string;
  expiresAt: number;
}) {
  const response = await fetch(args.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(args.secret ? { authorization: `Bearer ${args.secret}` } : {}),
    },
    body: JSON.stringify({
      channel: args.channel,
      destination: args.destination,
      code: args.token,
      expiresAt: args.expiresAt,
    }),
  });

  if (!response.ok) {
    throw new Error("OTP delivery provider rejected the request.");
  }
}

type EmailOtpSendParams = {
  identifier: string;
  token: string;
  expires: Date;
};

type ConvexAuthActionContext = {
  runMutation: (mutation: unknown, args: unknown) => Promise<unknown>;
  runAction: (action: unknown, args: unknown) => Promise<unknown>;
};

const sendEmailOtp = async (
  { identifier, token, expires }: EmailOtpSendParams,
  ctx: ConvexAuthActionContext,
) => {
  const destinationHash = await sha256Hex(identifier);
  await ctx.runMutation(internal.authSecurity.recordOtpRequest, {
    channel: "email",
    destinationHash,
    provider: "email-otp",
    expiresAt: expires.getTime(),
  });

  const webhookUrl = process.env.AUTH_EMAIL_OTP_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("AUTH_EMAIL_OTP_WEBHOOK_URL must be configured before Email OTP is enabled.");
  }

  await postOtpToWebhook({
    url: webhookUrl,
    secret: process.env.AUTH_EMAIL_OTP_WEBHOOK_SECRET,
    channel: "email",
    destination: identifier,
    token,
    expiresAt: expires.getTime(),
  });
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Email({
      id: "email-otp",
      maxAge: EMAIL_OTP_MAX_AGE_SECONDS,
      normalizeIdentifier: normalizeEmail,
      generateVerificationToken: async () => generateNumericOtp(),
      sendVerificationRequest: sendEmailOtp as unknown as Parameters<
        typeof Email
      >[0]["sendVerificationRequest"],
    }),
    Phone({
      id: "phone-otp",
      maxAge: PHONE_OTP_MAX_AGE_SECONDS,
      normalizeIdentifier: normalizePhone,
      generateVerificationToken: async () => generateNumericOtp(),
      sendVerificationRequest: async ({ identifier, token, expires }, ctx) => {
        if (process.env.AUTH_PHONE_OTP_ENABLED !== "true") {
          throw new Error("Phone OTP is disabled.");
        }

        const destinationHash = await sha256Hex(identifier);
        await ctx.runMutation(internal.authSecurity.recordOtpRequest, {
          channel: "sms",
          destinationHash,
          provider: "phone-otp",
          expiresAt: expires.getTime(),
        });

        const tokenHash = await sha256Hex(token);
        const idempotencyKey = await sha256Hex(
          ["phone-otp", destinationHash, tokenHash, expires.getTime()].join(":"),
        );
        await ctx.runAction(internal.sms.sendOtpSms, {
          toE164: identifier,
          destinationHash,
          token,
          expiresAt: expires.getTime(),
          idempotencyKey,
        });
      },
    }),
  ],
  session: {
    totalDurationMs: SESSION_TOTAL_MS,
    inactiveDurationMs: SESSION_INACTIVE_MS,
  },
  jwt: {
    durationMs: JWT_DURATION_MS,
  },
  signIn: {
    maxFailedAttempsPerHour: 8,
  },
  callbacks: {
    async beforeSessionCreation(ctx, { userId }) {
      await ctx.db.insert("auditEvents", {
        actorType: "user",
        action: "auth.login",
        metadata: { authUserId: userId },
        createdAt: Date.now(),
      });
    },
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, type, provider, profile }) {
      await ctx.db.insert("auditEvents", {
        actorType: "system",
        action: existingUserId === null ? "auth.account_created" : "auth.account_linked",
        metadata: {
          authUserId: userId,
          existingAuthUserId: existingUserId,
          provider: provider.id,
          type,
          hasEmail: typeof profile.email === "string",
          hasPhone: typeof profile.phone === "string",
        },
        createdAt: Date.now(),
      });
    },
  },
});
