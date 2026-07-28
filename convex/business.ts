import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { authenticatedIdentityKey } from "./lib/authorization";

async function currentProfile(ctx: QueryCtx) {
  const identityKey = await authenticatedIdentityKey(ctx);
  if (identityKey === null) return null;
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_identity_key", (q) => q.eq("identityKey", identityKey))
    .unique();
}

async function mediaUrls(ctx: QueryCtx, propertyId: Id<"properties">) {
  const media = await ctx.db
    .query("propertyMedia")
    .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
    .take(100);
  const active = media
    .filter(
      (item) =>
        item.deletedAt === undefined && (item.status === "uploaded" || item.status === "approved"),
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const resolved = await Promise.all(
    active.map(async (item) => ({
      kind: item.kind,
      url:
        item.storageId === undefined
          ? (item.legacyUrl ?? null)
          : await ctx.storage.getUrl(item.storageId),
    })),
  );
  return {
    images: resolved
      .filter((item) => item.kind === "image" && item.url !== null)
      .map((item) => item.url as string),
    videos: resolved
      .filter((item) => item.kind === "video" && item.url !== null)
      .map((item) => item.url as string),
  };
}

async function propertyView(ctx: QueryCtx, property: Doc<"properties">) {
  const owner = await ctx.db.get("ownerProfiles", property.ownerProfileId);
  const media = await mediaUrls(ctx, property._id);
  return {
    ...property,
    ownerName: owner?.fullName ?? "",
    ownerPhone: owner?.phone ?? "",
    images: media.images,
    videos: media.videos,
    services: [],
  };
}

export const snapshot = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const publishedProperties = await ctx.db
      .query("properties")
      .withIndex("by_status_city", (q) => q.eq("status", "published"))
      .order("desc")
      .take(100);
    const publicProperties = publishedProperties.filter(
      (item) =>
        item.deletedAt === undefined &&
        item.publicationStatus === "approved" &&
        item.workflowStatus === "published",
    );
    const publishedRoommates = await ctx.db
      .query("roommateRequests")
      .withIndex("by_status_created", (q) => q.eq("status", "open"))
      .order("desc")
      .take(100);
    const publicRoommates = publishedRoommates.filter(
      (item) =>
        item.deletedAt === undefined &&
        item.publicationStatus === "approved" &&
        item.workflowStatus === "published",
    );
    const profile = await currentProfile(ctx);
    const owner =
      profile === null
        ? null
        : await ctx.db
            .query("ownerProfiles")
            .withIndex("by_user", (q) => q.eq("userId", profile._id))
            .unique();
    const ownerProperties =
      owner === null
        ? []
        : await ctx.db
            .query("properties")
            .withIndex("by_owner_status", (q) => q.eq("ownerProfileId", owner._id))
            .order("desc")
            .take(100);
    const favoriteRows =
      profile === null
        ? []
        : await ctx.db
            .query("favorites")
            .withIndex("by_user", (q) => q.eq("userId", profile._id))
            .order("desc")
            .take(100);
    const interestRows =
      profile === null
        ? []
        : await ctx.db
            .query("interests")
            .withIndex("by_user_created", (q) => q.eq("userId", profile._id))
            .order("desc")
            .take(100);
    const roommateCards =
      profile === null
        ? []
        : await ctx.db
            .query("roommateRequests")
            .withIndex("by_user_status", (q) => q.eq("userId", profile._id))
            .order("desc")
            .take(100);
    const roommateInterestRows =
      profile === null
        ? []
        : await ctx.db
            .query("roommateInterests")
            .withIndex("by_requester_and_status", (q) =>
              q.eq("requesterUserId", profile._id).eq("status", "registered"),
            )
            .order("desc")
            .take(100);
    const bookings =
      profile === null
        ? []
        : await ctx.db
            .query("bookings")
            .withIndex("by_requester_and_status", (q) => q.eq("requesterUserId", profile._id))
            .order("desc")
            .take(100);
    const ownerBookings =
      owner === null
        ? []
        : await ctx.db
            .query("bookings")
            .withIndex("by_owner_and_status", (q) => q.eq("ownerProfileId", owner._id))
            .order("desc")
            .take(100);

    const propertyIds = new Set<Id<"properties">>();
    for (const property of publicProperties) propertyIds.add(property._id);
    for (const property of ownerProperties) propertyIds.add(property._id);
    for (const favorite of favoriteRows) propertyIds.add(favorite.propertyId);
    for (const interest of interestRows) propertyIds.add(interest.propertyId);
    for (const booking of bookings) propertyIds.add(booking.propertyId);
    for (const booking of ownerBookings) propertyIds.add(booking.propertyId);
    const properties = (
      await Promise.all(
        [...propertyIds].map(async (propertyId) => await ctx.db.get("properties", propertyId)),
      )
    ).filter((item): item is Doc<"properties"> => item !== null && item.deletedAt === undefined);
    const propertyViews = await Promise.all(
      properties.map(async (item) => propertyView(ctx, item)),
    );
    const propertyById = new Map(propertyViews.map((item) => [item._id, item]));

    const roommateProfiles = await Promise.all(
      publicRoommates.map(async (card) => await ctx.db.get("userProfiles", card.userId)),
    );
    return {
      profile,
      owner,
      properties: publicProperties.map((item) => propertyById.get(item._id) ?? item),
      ownerProperties: ownerProperties.map((item) => propertyById.get(item._id) ?? item),
      roommateRequests: publicRoommates.map((card, index) => ({
        ...card,
        requesterName: roommateProfiles[index]?.name ?? "",
      })),
      favoritePropertyIds: favoriteRows.map((item) => item.propertyId),
      favorites: favoriteRows
        .map((item) => propertyById.get(item.propertyId))
        .filter((item) => item !== undefined),
      interests: interestRows,
      roommateCards,
      roommateInterests: roommateInterestRows,
      bookings,
      ownerBookings,
    };
  },
});
