import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";

async function currentProfile(ctx: MutationCtx) {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId === null) throw new Error("Authentication required.");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
  if (profile === null || profile.status !== "active") {
    throw new Error("An active user profile is required.");
  }
  return profile;
}

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

function required(value: string | undefined, label: string) {
  if (!value?.trim()) throw new Error(`${label} is required.`);
}

export const submitPropertyForReview = mutation({
  args: { propertyId: v.id("properties") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await currentProfile(ctx);
    const property = await ctx.db.get("properties", args.propertyId);
    if (property === null || property.deletedAt !== undefined) {
      throw new Error("Property not found.");
    }
    const owner = await ctx.db.get("ownerProfiles", property.ownerProfileId);
    if (owner?.userId !== profile._id || owner.status !== "active") {
      throw new Error("Only the property owner can submit this listing.");
    }
    required(property.region, "Region");
    required(property.city, "City");
    required(property.district ?? property.neighborhood, "District");
    if (!validCoordinates(property.lat, property.lng)) {
      throw new Error("Verified property coordinates are required.");
    }
    const media = await ctx.db
      .query("propertyMedia")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(100);
    if (
      !media.some(
        (item) =>
          item.kind === "image" &&
          item.deletedAt === undefined &&
          (item.status === "uploaded" || item.status === "approved") &&
          (item.storageId !== undefined || Boolean(item.legacyUrl)),
      )
    ) {
      throw new Error("At least one uploaded property image is required.");
    }
    if (process.env.PUBLISHING_FEE_ENABLED === "true" && property.paymentCompleted !== true) {
      throw new Error("Publishing payment is required.");
    }
    const now = Date.now();
    await ctx.db.patch(property._id, {
      status: "pending_review",
      publicationStatus: "pending_review",
      moderationStatus: "pending",
      rejectionReason: undefined,
      submittedAt: now,
      reviewedAt: undefined,
      reviewedByUserId: undefined,
      publishedAt: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: profile._id,
      actorType: "user",
      action: "property.submitted_for_review",
      targetTable: "properties",
      targetId: property._id,
      createdAt: now,
    });
    return null;
  },
});

export const submitRoommateRequestForReview = mutation({
  args: { requestId: v.id("roommateRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await currentProfile(ctx);
    const request = await ctx.db.get("roommateRequests", args.requestId);
    if (request === null || request.deletedAt !== undefined) {
      throw new Error("Roommate request not found.");
    }
    if (request.userId !== profile._id) {
      throw new Error("Only the card owner can submit it.");
    }
    required(request.region, "Region");
    required(request.city, "City");
    required(request.district, "District");
    required(request.organization, "University");
    if (!validCoordinates(request.approximateLat, request.approximateLng)) {
      throw new Error("An approximate location is required.");
    }
    const now = Date.now();
    await ctx.db.patch(request._id, {
      publicationStatus: "pending_review",
      moderationStatus: "pending",
      rejectionReason: undefined,
      submittedAt: now,
      reviewedAt: undefined,
      reviewedByUserId: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: profile._id,
      actorType: "user",
      action: "roommate_request.submitted_for_review",
      targetTable: "roommateRequests",
      targetId: request._id,
      createdAt: now,
    });
    return null;
  },
});
