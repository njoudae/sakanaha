import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";

const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const OTP_REQUEST_LIMIT = 3;
const OTP_REQUEST_BLOCK_MS = 15 * 60 * 1000;
const AUTH_EVENT_WINDOW_MS = 60 * 1000;
const AUTH_EVENT_LIMIT = 20;

const authClientEvent = v.union(
  v.literal("login"),
  v.literal("logout"),
  v.literal("failed_login"),
  v.literal("otp_verified"),
  v.literal("otp_failed"),
);

const otpChannel = v.union(v.literal("email"), v.literal("sms"));

function auditActionForClientEvent(event: string) {
  switch (event) {
    case "login":
      return "auth.login";
    case "logout":
      return "auth.logout";
    case "failed_login":
      return "auth.failed_login";
    case "otp_verified":
      return "auth.otp_verified";
    case "otp_failed":
      return "auth.otp_failed";
    default:
      return "auth.event";
  }
}

function windowStartFor(now: number, windowMs: number) {
  return Math.floor(now / windowMs) * windowMs;
}

function sanitizeClientEventValue(value: string | undefined, maxLength: number) {
  if (value === undefined) return undefined;
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(?:\+?966|0)?5\d{8}/g, "[redacted-phone]")
    .replace(/([?&](?:token|code|secret|key|email|phone)=)[^&#\s]+/gi, "$1[redacted]")
    .trim()
    .slice(0, maxLength);
}

export const recordOtpRequest = internalMutation({
  args: {
    channel: otpChannel,
    destinationHash: v.string(),
    provider: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scope = args.channel === "sms" ? "phone" : "email";
    const action = `auth.otp.request.${args.channel}`;
    const windowStart = windowStartFor(now, OTP_REQUEST_WINDOW_MS);
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_key_action_window", (q) =>
        q
          .eq("scope", scope)
          .eq("keyHash", args.destinationHash)
          .eq("action", action)
          .eq("windowStart", windowStart),
      )
      .first();

    if (existing?.blockedUntil !== undefined && existing.blockedUntil > now) {
      await ctx.db.insert("auditEvents", {
        actorType: "system",
        action: "auth.otp_failed",
        metadata: {
          channel: args.channel,
          provider: args.provider,
          reason: "request_rate_limited",
        },
        createdAt: now,
      });
      throw new Error("Too many OTP requests. Try again later.");
    }

    const nextCount = (existing?.count ?? 0) + 1;
    if (nextCount > OTP_REQUEST_LIMIT) {
      const blockedUntil = now + OTP_REQUEST_BLOCK_MS;
      if (existing) {
        await ctx.db.patch(existing._id, {
          count: nextCount,
          blockedUntil,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("rateLimits", {
          scope,
          keyHash: args.destinationHash,
          action,
          windowStart,
          count: nextCount,
          blockedUntil,
          updatedAt: now,
        });
      }
      await ctx.db.insert("auditEvents", {
        actorType: "system",
        action: "auth.otp_failed",
        metadata: {
          channel: args.channel,
          provider: args.provider,
          reason: "request_rate_limited",
        },
        createdAt: now,
      });
      throw new Error("Too many OTP requests. Try again later.");
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        count: nextCount,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("rateLimits", {
        scope,
        keyHash: args.destinationHash,
        action,
        windowStart,
        count: nextCount,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditEvents", {
      actorType: "system",
      action: "auth.otp_requested",
      metadata: {
        channel: args.channel,
        provider: args.provider,
        expiresAt: args.expiresAt,
      },
      createdAt: now,
    });
  },
});

export const recordAuthClientEvent = mutation({
  args: {
    event: authClientEvent,
    provider: v.optional(v.string()),
    channel: v.optional(otpChannel),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) throw new Error("Authentication required.");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (profile === null || profile.status !== "active")
      throw new Error("Active profile required.");

    const now = Date.now();
    const windowStart = windowStartFor(now, AUTH_EVENT_WINDOW_MS);
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_key_action_window", (q) =>
        q
          .eq("scope", "user")
          .eq("keyHash", String(profile._id))
          .eq("action", "auth.client_event")
          .eq("windowStart", windowStart),
      )
      .unique();
    if (existing !== null && existing.count >= AUTH_EVENT_LIMIT) {
      throw new Error("Authentication event rate limit exceeded.");
    }
    if (existing === null) {
      await ctx.db.insert("rateLimits", {
        scope: "user",
        keyHash: String(profile._id),
        action: "auth.client_event",
        windowStart,
        count: 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, { count: existing.count + 1, updatedAt: now });
    }

    await ctx.db.insert("auditEvents", {
      actorUserId: profile._id,
      actorType: "user",
      action: auditActionForClientEvent(args.event),
      metadata: {
        provider: sanitizeClientEventValue(args.provider, 40),
        channel: args.channel,
        reason: sanitizeClientEventValue(args.reason, 160),
      },
      createdAt: now,
    });
  },
});
