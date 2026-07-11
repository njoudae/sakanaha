import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const recordProviderUsage = internalMutation({
  args: {
    provider: v.string(),
    operation: v.string(),
    unitCount: v.number(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("skipped")),
    estimatedCost: v.optional(v.number()),
    currency: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("providerUsageEvents", {
      provider: args.provider,
      capability: "maps",
      operation: args.operation,
      unitCount: args.unitCount,
      status: args.status,
      estimatedCost: args.estimatedCost,
      currency: args.currency,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

export const consumeMapsRateLimit = internalMutation({
  args: {
    provider: v.string(),
    operation: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const keyHash = args.provider;
    const action = `maps.${args.operation}`;
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_key_action_window", (q) =>
        q
          .eq("scope", "provider")
          .eq("keyHash", keyHash)
          .eq("action", action)
          .eq("windowStart", windowStart),
      )
      .first();

    if (existing !== null && existing.count >= args.limit) {
      await ctx.db.insert("auditEvents", {
        actorType: "system",
        action: "maps.rate_limited",
        metadata: {
          provider: args.provider,
          operation: args.operation,
          limit: args.limit,
        },
        createdAt: now,
      });
      throw new Error("Maps provider rate limit exceeded.");
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        updatedAt: now,
      });
      return;
    }

    await ctx.db.insert("rateLimits", {
      scope: "provider",
      keyHash,
      action,
      windowStart,
      count: 1,
      updatedAt: now,
    });
  },
});
