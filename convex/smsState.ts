import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const SMS_HOUR_MS = 60 * 60 * 1000;
const SMS_DAY_MS = 24 * SMS_HOUR_MS;

function windowStartFor(now: number, windowMs: number) {
  return Math.floor(now / windowMs) * windowMs;
}

async function consumeLimit(
  ctx: MutationCtx,
  args: {
    scope: "global" | "phone" | "ip";
    keyHash: string;
    action: string;
    limit: number;
    windowMs: number;
    now: number;
  },
) {
  if (args.limit <= 0) {
    throw new Error("SMS delivery is disabled by rate limit configuration.");
  }

  const windowStart = windowStartFor(args.now, args.windowMs);
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_scope_key_action_window", (q) =>
      q
        .eq("scope", args.scope)
        .eq("keyHash", args.keyHash)
        .eq("action", args.action)
        .eq("windowStart", windowStart),
    )
    .first();

  if (existing !== null && existing.count >= args.limit) {
    await ctx.db.insert("auditEvents", {
      actorType: "system",
      action: "sms.rate_limited",
      metadata: {
        scope: args.scope,
        action: args.action,
        limit: args.limit,
      },
      createdAt: args.now,
    });
    throw new Error("SMS rate limit exceeded.");
  }

  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      updatedAt: args.now,
    });
    return;
  }

  await ctx.db.insert("rateLimits", {
    scope: args.scope,
    keyHash: args.keyHash,
    action: args.action,
    windowStart,
    count: 1,
    updatedAt: args.now,
  });
}

export const reserveSmsMessage = internalMutation({
  args: {
    provider: v.string(),
    userId: v.optional(v.id("userProfiles")),
    purpose: v.union(v.literal("otp"), v.literal("notification"), v.literal("support")),
    toHash: v.string(),
    bodyTemplate: v.string(),
    idempotencyKey: v.string(),
    expiresAt: v.optional(v.number()),
    hourlyLimit: v.number(),
    dailyLimit: v.number(),
    perUserHourlyLimit: v.number(),
    perUserDailyLimit: v.number(),
    ipHash: v.optional(v.string()),
    perIpHourlyLimit: v.number(),
    perIpDailyLimit: v.number(),
    destinationAccountHourlyLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("smsMessages")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();
    if (existing !== null) {
      return {
        messageId: existing._id,
        duplicate: true,
        status: existing.status,
        providerMessageId: existing.providerMessageId,
      };
    }

    const now = Date.now();
    await consumeLimit(ctx, {
      scope: "global",
      keyHash: "global",
      action: "sms.send.hourly",
      limit: args.hourlyLimit,
      windowMs: SMS_HOUR_MS,
      now,
    });
    await consumeLimit(ctx, {
      scope: "global",
      keyHash: "global",
      action: "sms.send.daily",
      limit: args.dailyLimit,
      windowMs: SMS_DAY_MS,
      now,
    });
    await consumeLimit(ctx, {
      scope: "phone",
      keyHash: args.toHash,
      action: "sms.send.per_user.hourly",
      limit: args.perUserHourlyLimit,
      windowMs: SMS_HOUR_MS,
      now,
    });
    await consumeLimit(ctx, {
      scope: "phone",
      keyHash: args.toHash,
      action: "sms.send.per_user.daily",
      limit: args.perUserDailyLimit,
      windowMs: SMS_DAY_MS,
      now,
    });
    if (args.ipHash !== undefined) {
      await consumeLimit(ctx, {
        scope: "ip",
        keyHash: args.ipHash,
        action: "sms.send.ip.hourly",
        limit: args.perIpHourlyLimit,
        windowMs: SMS_HOUR_MS,
        now,
      });
      await consumeLimit(ctx, {
        scope: "ip",
        keyHash: args.ipHash,
        action: "sms.send.ip.daily",
        limit: args.perIpDailyLimit,
        windowMs: SMS_DAY_MS,
        now,
      });
    }

    if (args.userId !== undefined && args.destinationAccountHourlyLimit > 0) {
      const recentMessages = await ctx.db
        .query("smsMessages")
        .withIndex("by_to_created", (q) =>
          q.eq("toHash", args.toHash).gte("createdAt", now - SMS_HOUR_MS),
        )
        .take(args.destinationAccountHourlyLimit + 1);
      const otherUsers = new Set(
        recentMessages
          .map((message) => message.userId)
          .filter((userId) => userId !== undefined && userId !== args.userId)
          .map((userId) => String(userId)),
      );

      if (otherUsers.size >= args.destinationAccountHourlyLimit) {
        await ctx.db.insert("auditEvents", {
          actorUserId: args.userId,
          actorType: "system",
          action: "sms.destination_account_reuse_blocked",
          metadata: {
            destinationAccountHourlyLimit: args.destinationAccountHourlyLimit,
            relatedAccountCount: otherUsers.size,
          },
          ipHash: args.ipHash,
          createdAt: now,
        });
        throw new Error("SMS destination account limit exceeded.");
      }
    }

    const messageId = await ctx.db.insert("smsMessages", {
      provider: args.provider,
      userId: args.userId,
      purpose: args.purpose,
      toHash: args.toHash,
      bodyTemplate: args.bodyTemplate,
      status: "queued",
      idempotencyKey: args.idempotencyKey,
      attemptCount: 0,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      messageId,
      duplicate: false,
      status: "queued",
      providerMessageId: undefined,
    };
  },
});

export const markSmsAttempt = internalMutation({
  args: {
    messageId: v.id("smsMessages"),
    attemptCount: v.number(),
    nextAttemptAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      attemptCount: args.attemptCount,
      nextAttemptAt: args.nextAttemptAt,
      lastError: args.lastError,
      updatedAt: Date.now(),
    });
  },
});

export const markSmsSent = internalMutation({
  args: {
    messageId: v.id("smsMessages"),
    provider: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("expired"),
    ),
    attemptCount: v.number(),
    providerMessageId: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const message = await ctx.db.get(args.messageId);
    await ctx.db.patch(args.messageId, {
      provider: args.provider,
      status: args.status,
      providerMessageId: args.providerMessageId,
      costEstimate: args.estimatedCost,
      currency: args.currency,
      attemptCount: args.attemptCount,
      nextAttemptAt: undefined,
      deliveredAt: args.status === "delivered" ? now : undefined,
      failedAt: args.status === "failed" || args.status === "expired" ? now : undefined,
      updatedAt: now,
    });

    await ctx.db.insert("providerUsageEvents", {
      provider: args.provider,
      capability: "sms",
      operation: "otp_send",
      relatedUserId: message?.userId,
      unitCount: 1,
      estimatedCost: args.estimatedCost,
      currency: args.currency,
      status: args.status === "failed" || args.status === "expired" ? "failed" : "success",
      metadata: {
        smsMessageId: args.messageId,
        deliveryStatus: args.status,
        hasProviderMessageId: args.providerMessageId !== undefined,
      },
      createdAt: now,
    });
  },
});

export const markSmsFailed = internalMutation({
  args: {
    messageId: v.id("smsMessages"),
    provider: v.string(),
    attemptCount: v.number(),
    status: v.union(v.literal("failed"), v.literal("expired")),
    lastError: v.string(),
    estimatedCost: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const message = await ctx.db.get(args.messageId);
    await ctx.db.patch(args.messageId, {
      provider: args.provider,
      status: args.status,
      attemptCount: args.attemptCount,
      lastError: args.lastError,
      nextAttemptAt: undefined,
      failedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("providerUsageEvents", {
      provider: args.provider,
      capability: "sms",
      operation: "otp_send",
      relatedUserId: message?.userId,
      unitCount: 1,
      estimatedCost: args.estimatedCost,
      currency: args.currency,
      status: "failed",
      metadata: {
        smsMessageId: args.messageId,
        deliveryStatus: args.status,
        reason: args.lastError,
      },
      createdAt: now,
    });
  },
});
