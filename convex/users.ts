import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveProfile } from "./lib/authorization";
import { recordBusinessAudit } from "./lib/businessEvents";

const roommatePreferences = v.object({
  smoking: v.union(v.literal("yes"), v.literal("no")),
  guests: v.union(
    v.literal("never"),
    v.literal("occasionally"),
    v.literal("frequently"),
    v.literal("no_preference"),
  ),
  sleep: v.union(v.literal("early"), v.literal("flexible"), v.literal("late")),
  cleanliness: v.union(v.literal("very_tidy"), v.literal("average"), v.literal("no_preference")),
  pets: v.union(v.literal("allowed"), v.literal("not_allowed")),
  cooking: v.union(v.literal("frequently"), v.literal("occasionally"), v.literal("rarely")),
  occupation: v.union(v.literal("student"), v.literal("employee"), v.literal("both")),
  noise: v.union(v.literal("quiet"), v.literal("moderate"), v.literal("no_preference")),
});

export const current = query({
  args: {},
  handler: async (ctx) => await requireActiveProfile(ctx),
});

export const updateMine = mutation({
  args: {
    name: v.string(),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    roommatePreferences: v.optional(roommatePreferences),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const name = args.name.trim().slice(0, 120);
    if (!name) throw new Error("Name is required.");
    const now = Date.now();
    const next = {
      name,
      city: args.city?.trim().slice(0, 100) || undefined,
      district: args.district?.trim().slice(0, 120) || undefined,
      phone: args.phone?.trim().slice(0, 30) || undefined,
      email: args.email?.trim().toLowerCase().slice(0, 254) || undefined,
      roommatePreferences: args.roommatePreferences,
    };
    await ctx.db.patch(profile._id, { ...next, updatedAt: now });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "user.profile.updated",
      entityType: "userProfiles",
      entityId: profile._id,
      reason: "User updated their profile",
      previousValue: { name: profile.name, city: profile.city, district: profile.district },
      newValue: { name: next.name, city: next.city, district: next.district },
    });
    return null;
  },
});

export const setFavorite = mutation({
  args: { propertyId: v.id("properties"), favorite: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const property = await ctx.db.get("properties", args.propertyId);
    if (
      property === null ||
      property.deletedAt !== undefined ||
      property.status !== "published" ||
      property.publicationStatus !== "approved"
    ) {
      throw new Error("Property not found.");
    }
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_property", (q) =>
        q.eq("userId", profile._id).eq("propertyId", property._id),
      )
      .unique();
    if (args.favorite && existing === null) {
      await ctx.db.insert("favorites", {
        userId: profile._id,
        propertyId: property._id,
        city: property.city,
        createdAt: Date.now(),
      });
    } else if (!args.favorite && existing !== null) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const listFavorites = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireActiveProfile(ctx);
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", profile._id))
      .order("desc")
      .take(100);
    const properties = await Promise.all(
      favorites.map(async (favorite) => await ctx.db.get("properties", favorite.propertyId)),
    );
    return properties.filter(
      (property) =>
        property !== null &&
        property.deletedAt === undefined &&
        property.status === "published" &&
        property.publicationStatus === "approved",
    );
  },
});
