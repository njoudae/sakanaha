import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { actorType } from "./validators";
import {
  normalizeAuditAction,
  normalizeUsageEventName,
  normalizeUsageRoute,
  sanitizeAuditMetadata,
  sanitizeUsageProperties,
  type AnalyticsProperty,
} from "./observabilitySupport";

const analyticsProperties = v.record(
  v.string(),
  v.union(v.string(), v.number(), v.boolean(), v.null()),
);

async function currentProfile(ctx: QueryCtx | MutationCtx) {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId === null) throw new Error("Authentication required.");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
  if (profile === null || profile.status !== "active") throw new Error("Active profile required.");
  return profile;
}

type ObservabilityRole = "admin" | "support" | "moderator";

async function requireObservabilityRole(ctx: QueryCtx, allowedRoles: readonly ObservabilityRole[]) {
  const profile = await currentProfile(ctx);
  if (
    (profile.primaryRole === "admin" ||
      profile.primaryRole === "support" ||
      profile.primaryRole === "moderator") &&
    allowedRoles.includes(profile.primaryRole)
  ) {
    return { profile, role: profile.primaryRole };
  }
  const assignments = await ctx.db
    .query("roleAssignments")
    .withIndex("by_user", (q) => q.eq("userId", profile._id))
    .take(20);
  for (const role of allowedRoles) {
    if (
      assignments.some(
        (assignment) =>
          assignment.status === "active" &&
          assignment.scope === "global" &&
          assignment.role === role,
      )
    ) {
      return { profile, role };
    }
  }
  throw new Error("Observability access required.");
}

function minuteWindow(now: number) {
  return Math.floor(now / 60_000) * 60_000;
}

async function insertUsageEvent(
  ctx: MutationCtx,
  args: {
    userId: Id<"userProfiles">;
    name: string;
    route?: string;
    properties?: Record<string, AnalyticsProperty>;
    environment: string;
  },
) {
  const now = Date.now();
  if (args.environment.trim().length === 0 || args.environment.length > 40) {
    throw new Error("Invalid analytics environment.");
  }
  const rateLimit = await ctx.db
    .query("rateLimits")
    .withIndex("by_scope_key_action_window", (q) =>
      q
        .eq("scope", "user")
        .eq("keyHash", String(args.userId))
        .eq("action", "analytics.capture")
        .eq("windowStart", minuteWindow(now)),
    )
    .unique();
  if (rateLimit !== null && rateLimit.count >= 60)
    throw new Error("Analytics rate limit exceeded.");
  if (rateLimit === null) {
    await ctx.db.insert("rateLimits", {
      scope: "user",
      keyHash: String(args.userId),
      action: "analytics.capture",
      windowStart: minuteWindow(now),
      count: 1,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(rateLimit._id, { count: rateLimit.count + 1, updatedAt: now });
  }

  return await ctx.db.insert("usageAnalyticsEvents", {
    userId: args.userId,
    name: normalizeUsageEventName(args.name),
    route: normalizeUsageRoute(args.route),
    properties: sanitizeUsageProperties(args.properties),
    environment: args.environment.trim(),
    createdAt: now,
  });
}

export const recordUsage = mutation({
  args: {
    name: v.string(),
    route: v.optional(v.string()),
    properties: v.optional(analyticsProperties),
    environment: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await currentProfile(ctx);
    await insertUsageEvent(ctx, { ...args, userId: profile._id });
    return null;
  },
});

export const recordUsageInternal = internalMutation({
  args: {
    userId: v.id("userProfiles"),
    name: v.string(),
    route: v.optional(v.string()),
    properties: v.optional(analyticsProperties),
    environment: v.string(),
  },
  handler: async (ctx, args) => await insertUsageEvent(ctx, args),
});

export const recordAudit = internalMutation({
  args: {
    actorUserId: v.optional(v.id("userProfiles")),
    actorType,
    action: v.string(),
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditEvents", {
      actorUserId: args.actorUserId,
      actorType: args.actorType,
      action: normalizeAuditAction(args.action),
      targetTable: args.targetTable?.slice(0, 80),
      targetId: args.targetId?.slice(0, 160),
      metadata: sanitizeAuditMetadata(args.metadata),
      createdAt: Date.now(),
    });
  },
});

export const listUsage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireObservabilityRole(ctx, ["admin"]);
    return await ctx.db
      .query("usageAnalyticsEvents")
      .withIndex("by_created")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listAudit = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const access = await requireObservabilityRole(ctx, ["admin", "support", "moderator"]);
    const result = await ctx.db
      .query("auditEvents")
      .withIndex("by_created")
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((event) => ({
        ...event,
        _id: access.role === "admin" ? event._id : undefined,
        _creationTime: access.role === "admin" ? event._creationTime : undefined,
        actorUserId: access.role === "admin" ? event.actorUserId : undefined,
        targetId: access.role === "admin" ? event.targetId : undefined,
        metadata: sanitizeAuditMetadata(event.metadata),
        ipHash: undefined,
        userAgentHash: undefined,
      })),
    };
  },
});
