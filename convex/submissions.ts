import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireActiveProfile } from "./lib/authorization";

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
    const profile = await requireActiveProfile(ctx);
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
    if (property.paymentStatus !== "paid" && property.paymentCompleted !== true) {
      throw new Error("Publishing payment is required.");
    }
    const now = Date.now();
    await ctx.db.patch(property._id, {
      status: "pending_review",
      workflowStatus: "pending_admin_review",
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
      previousValue: { workflowStatus: property.workflowStatus ?? property.publicationStatus },
      newValue: { workflowStatus: "pending_admin_review" },
      timestamp: now,
      createdAt: now,
    });
    return null;
  },
});

export const submitRoommateRequestForReview = mutation({
  args: { requestId: v.id("roommateRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const request = await ctx.db.get("roommateRequests", args.requestId);
    if (request === null || request.deletedAt !== undefined) {
      throw new Error("Roommate request not found.");
    }
    if (request.userId !== profile._id) {
      throw new Error("Only the card owner can submit it.");
    }
    const city = request.externalHousing?.city ?? request.city;
    const district = request.externalHousing?.district ?? request.district;
    required(
      request.region ?? request.externalHousing?.approximateLocation ?? "external",
      "Region",
    );
    required(city, "City");
    required(district, "District");
    required(request.organization, "University");
    const lat = request.externalHousing?.approximateLat ?? request.approximateLat;
    const lng = request.externalHousing?.approximateLng ?? request.approximateLng;
    if (!validCoordinates(lat, lng)) {
      throw new Error("An approximate location is required.");
    }
    const now = Date.now();
    await ctx.db.patch(request._id, {
      workflowStatus: request.paymentStatus === "paid" ? "pending_admin_review" : "pending_payment",
      publicationStatus: request.paymentStatus === "paid" ? "pending_review" : "draft",
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
      action:
        request.paymentStatus === "paid"
          ? "roommate_request.submitted_for_review"
          : "roommate_request.payment_requested",
      targetTable: "roommateRequests",
      targetId: request._id,
      previousValue: { workflowStatus: request.workflowStatus ?? request.publicationStatus },
      newValue: {
        workflowStatus:
          request.paymentStatus === "paid" ? "pending_admin_review" : "pending_payment",
      },
      timestamp: now,
      createdAt: now,
    });
    return null;
  },
});
