import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getGeocodeCache = internalQuery({
  args: {
    provider: v.string(),
    requestHash: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("geocodeCache")
      .withIndex("by_provider_request_hash", (q) =>
        q.eq("provider", args.provider).eq("requestHash", args.requestHash),
      )
      .first();
    if (cached === null) return null;
    if (cached.expiresAt !== undefined && cached.expiresAt <= args.now) return null;
    return cached;
  },
});

export const storeGeocodeCache = internalMutation({
  args: {
    provider: v.string(),
    requestHash: v.string(),
    query: v.string(),
    lat: v.number(),
    lng: v.number(),
    formattedAddress: v.optional(v.string()),
    quality: v.union(
      v.literal("manual"),
      v.literal("geocoded"),
      v.literal("verified"),
      v.literal("approximate"),
    ),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("geocodeCache")
      .withIndex("by_provider_request_hash", (q) =>
        q.eq("provider", args.provider).eq("requestHash", args.requestHash),
      )
      .first();
    const value = {
      query: args.query,
      lat: args.lat,
      lng: args.lng,
      formattedAddress: args.formattedAddress,
      quality: args.quality,
      expiresAt: args.expiresAt,
      updatedAt: now,
    };
    if (existing !== null) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return await ctx.db.insert("geocodeCache", {
      provider: args.provider,
      requestHash: args.requestHash,
      ...value,
      createdAt: now,
    });
  },
});

export const getRouteCache = internalQuery({
  args: {
    provider: v.string(),
    requestHash: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("routeCache")
      .withIndex("by_provider_request_hash", (q) =>
        q.eq("provider", args.provider).eq("requestHash", args.requestHash),
      )
      .first();
    if (cached === null) return null;
    if (cached.expiresAt !== undefined && cached.expiresAt <= args.now) return null;
    return cached;
  },
});

export const storeRouteCache = internalMutation({
  args: {
    provider: v.string(),
    requestHash: v.string(),
    originLat: v.number(),
    originLng: v.number(),
    destinationLat: v.number(),
    destinationLng: v.number(),
    distanceMeters: v.number(),
    durationSeconds: v.number(),
    routeSummary: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("routeCache")
      .withIndex("by_provider_request_hash", (q) =>
        q.eq("provider", args.provider).eq("requestHash", args.requestHash),
      )
      .first();
    const value = {
      originLat: args.originLat,
      originLng: args.originLng,
      destinationLat: args.destinationLat,
      destinationLng: args.destinationLng,
      distanceMeters: args.distanceMeters,
      durationSeconds: args.durationSeconds,
      routeSummary: args.routeSummary,
      expiresAt: args.expiresAt,
      updatedAt: now,
    };
    if (existing !== null) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return await ctx.db.insert("routeCache", {
      provider: args.provider,
      requestHash: args.requestHash,
      ...value,
      createdAt: now,
    });
  },
});
