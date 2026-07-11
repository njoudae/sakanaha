import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

function boundedCounters(args: {
  existing?: {
    sampleCount: number;
    successCount: number;
    failureCount: number;
    deliveryAttemptCount: number;
    deliverySuccessCount: number;
  } | null;
  windowSize: number;
  status: "success" | "failure" | "skipped";
  deliveryStatus?: "queued" | "sent" | "delivered" | "failed" | "expired" | "skipped";
}) {
  const shouldReset = (args.existing?.sampleCount ?? 0) >= args.windowSize;
  const base = shouldReset || args.existing == null ? undefined : args.existing;
  const counts = {
    sampleCount: base?.sampleCount ?? 0,
    successCount: base?.successCount ?? 0,
    failureCount: base?.failureCount ?? 0,
    deliveryAttemptCount: base?.deliveryAttemptCount ?? 0,
    deliverySuccessCount: base?.deliverySuccessCount ?? 0,
  };

  if (args.status === "skipped") return counts;

  counts.sampleCount += 1;
  if (args.status === "success") {
    counts.successCount += 1;
  } else {
    counts.failureCount += 1;
  }

  counts.deliveryAttemptCount += 1;
  if (
    args.deliveryStatus === "queued" ||
    args.deliveryStatus === "sent" ||
    args.deliveryStatus === "delivered"
  ) {
    counts.deliverySuccessCount += 1;
  }

  return counts;
}

export const canUseProvider = internalQuery({
  args: {
    provider: v.string(),
    operation: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const health = await ctx.db
      .query("smsProviderHealth")
      .withIndex("by_provider_operation", (q) =>
        q.eq("provider", args.provider).eq("operation", args.operation),
      )
      .first();
    return !(health?.circuitOpenUntil !== undefined && health.circuitOpenUntil > args.now);
  },
});

export const recordProviderHealth = internalMutation({
  args: {
    provider: v.string(),
    operation: v.string(),
    responseTimeMs: v.number(),
    status: v.union(v.literal("success"), v.literal("failure"), v.literal("skipped")),
    deliveryStatus: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("failed"),
        v.literal("expired"),
        v.literal("skipped"),
      ),
    ),
    retryable: v.boolean(),
    failureRateDisableThreshold: v.number(),
    minimumSampleSize: v.number(),
    windowSize: v.number(),
    cooldownMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("smsProviderHealth")
      .withIndex("by_provider_operation", (q) =>
        q.eq("provider", args.provider).eq("operation", args.operation),
      )
      .first();
    const counts = boundedCounters({
      existing,
      windowSize: Math.max(1, args.windowSize),
      status: args.status,
      deliveryStatus: args.deliveryStatus,
    });
    const failureRate =
      counts.sampleCount === 0
        ? (existing?.failureRate ?? 0)
        : counts.failureCount / counts.sampleCount;
    const deliverySuccessRate =
      counts.deliveryAttemptCount === 0
        ? (existing?.deliverySuccessRate ?? 0)
        : counts.deliverySuccessCount / counts.deliveryAttemptCount;
    const shouldOpenCircuit =
      args.retryable &&
      counts.sampleCount >= args.minimumSampleSize &&
      failureRate >= args.failureRateDisableThreshold;
    const circuitOpenUntil =
      shouldOpenCircuit || args.status === "skipped"
        ? (existing?.circuitOpenUntil ?? now + args.cooldownMs)
        : undefined;
    const status: "healthy" | "degraded" | "unavailable" =
      circuitOpenUntil !== undefined ? "unavailable" : failureRate > 0 ? "degraded" : "healthy";
    const value = {
      status,
      responseTimeMs: args.responseTimeMs,
      failureRate,
      deliverySuccessRate,
      ...counts,
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

    return await ctx.db.insert("smsProviderHealth", {
      provider: args.provider,
      operation: args.operation,
      ...value,
    });
  },
});
