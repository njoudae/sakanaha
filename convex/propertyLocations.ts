import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

function validCoordinates(lat: number | undefined, lng: number | undefined) {
  return (
    lat !== undefined &&
    lng !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export const getForViewer = query({
  args: { propertyId: v.id("properties") },
  returns: v.union(
    v.null(),
    v.object({
      lat: v.number(),
      lng: v.number(),
      precision: v.union(v.literal("exact"), v.literal("approximate")),
    }),
  ),
  handler: async (ctx, args) => {
    const property = await ctx.db.get("properties", args.propertyId);
    if (
      !property ||
      property.deletedAt !== undefined ||
      !validCoordinates(property.lat, property.lng)
    ) {
      return null;
    }

    let canManage = false;
    const authUserId = await getAuthUserId(ctx);
    if (authUserId) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
        .unique();
      if (profile) {
        if (profile.primaryRole === "admin" || profile.primaryRole === "moderator") {
          canManage = true;
        } else {
          const owner = await ctx.db.get("ownerProfiles", property.ownerProfileId);
          canManage = owner?.userId === profile._id && owner.status === "active";
        }
      }
    }

    if (canManage) {
      return {
        lat: Number(property.lat!.toFixed(6)),
        lng: Number(property.lng!.toFixed(6)),
        precision: "exact" as const,
      };
    }
    if (
      property.status !== "published" ||
      (property.publicationStatus ?? property.moderationStatus) !== "approved" ||
      property.moderationStatus !== "approved" ||
      property.locationVisibility === "private"
    ) {
      return null;
    }
    if (property.locationVisibility === "approximate") {
      return {
        lat: Number(property.lat!.toFixed(2)),
        lng: Number(property.lng!.toFixed(2)),
        precision: "approximate" as const,
      };
    }
    return {
      lat: Number(property.lat!.toFixed(6)),
      lng: Number(property.lng!.toFixed(6)),
      precision: "exact" as const,
    };
  },
});
