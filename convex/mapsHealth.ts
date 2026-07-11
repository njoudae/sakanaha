import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const canUseProvider = internalQuery({
  args: {
    provider: v.string(),
    operation: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const health = await ctx.db
      .query("mapProviderHealth")
      .withIndex("by_provider_operation", (q) =>
        q.eq("provider", args.provider).eq("operation", args.operation),
      )
      .first();
    if (health?.circuitOpenUntil !== undefined && health.circuitOpenUntil > args.now) {
      return false;
    }
    return true;
  },
});

export const recordHealth = internalMutation({
  args: {
    provider: v.string(),
    operation: v.string(),
    responseTimeMs: v.number(),
    quotaStatus: v.union(
      v.literal("ok"),
      v.literal("near_limit"),
      v.literal("limited"),
      v.literal("unknown"),
    ),
    status: v.union(v.literal("success"), v.literal("failure"), v.literal("skipped")),
    retryable: v.boolean(),
    failureThreshold: v.number(),
    cooldownMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mapProviderHealth")
      .withIndex("by_provider_operation", (q) =>
        q.eq("provider", args.provider).eq("operation", args.operation),
      )
      .first();

    const existingFailures = existing?.failureCount ?? 0;
    const failureCount =
      args.status === "success" ? 0 : args.retryable ? existingFailures + 1 : existingFailures;
    const circuitOpenUntil =
      args.retryable && failureCount >= args.failureThreshold ? now + args.cooldownMs : undefined;
    const status: "healthy" | "degraded" | "unavailable" =
      args.status === "success"
        ? "healthy"
        : circuitOpenUntil !== undefined || args.quotaStatus === "limited"
          ? "unavailable"
          : "degraded";

    const value = {
      status,
      quotaStatus: args.quotaStatus,
      responseTimeMs: args.responseTimeMs,
      failureCount,
      circuitOpenUntil,
      lastSuccessAt: args.status === "success" ? now : existing?.lastSuccessAt,
      lastFailureAt: args.status === "failure" ? now : existing?.lastFailureAt,
      checkedAt: now,
      updatedAt: now,
    };

    if (existing !== null) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }

    return await ctx.db.insert("mapProviderHealth", {
      provider: args.provider,
      operation: args.operation,
      ...value,
    });
  },
});
