import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";

const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const OTP_REQUEST_LIMIT = 3;
const OTP_REQUEST_BLOCK_MS = 15 * 60 * 1000;

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
    await ctx.db.insert("auditEvents", {
      actorType: authUserId === null ? "system" : "user",
      action: auditActionForClientEvent(args.event),
      metadata: {
        authUserId,
        provider: args.provider,
        channel: args.channel,
        reason: args.reason,
      },
      createdAt: Date.now(),
    });
  },
});
