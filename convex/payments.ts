import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { requireActiveProfile } from "./lib/authorization";
import { paymentEntityType } from "./validators";

export const createIntent = mutation({
  args: {
    entityType: paymentEntityType,
    propertyId: v.optional(v.id("properties")),
    roommateRequestId: v.optional(v.id("roommateRequests")),
    provider: v.string(),
    idempotencyKey: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  returns: v.id("payments"),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    if (args.amount <= 0) throw new Error("Payment amount must be positive.");
    if (
      (args.entityType === "property" && args.propertyId === undefined) ||
      (args.entityType === "roommate_card" && args.roommateRequestId === undefined)
    ) {
      throw new Error("The payment target does not match its entity type.");
    }
    if (args.propertyId !== undefined) {
      const property = await ctx.db.get("properties", args.propertyId);
      const owner = property && (await ctx.db.get("ownerProfiles", property.ownerProfileId));
      if (owner?.userId !== profile._id) throw new Error("Payment target is not owned by you.");
    }
    if (args.roommateRequestId !== undefined) {
      const card = await ctx.db.get("roommateRequests", args.roommateRequestId);
      if (card?.userId !== profile._id) throw new Error("Payment target is not owned by you.");
    }
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing !== null) return existing._id;
    const now = Date.now();
    return await ctx.db.insert("payments", {
      userId: profile._id,
      entityType: args.entityType,
      propertyId: args.propertyId,
      roommateRequestId: args.roommateRequestId,
      provider: args.provider,
      idempotencyKey: args.idempotencyKey,
      amount: args.amount,
      currency: args.currency,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const recordVerified = internalMutation({
  args: {
    idempotencyKey: v.string(),
    providerReference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (payment === null) throw new Error("Payment intent not found.");
    if (payment.status === "paid") return null;
    const now = Date.now();
    await ctx.db.patch(payment._id, {
      status: "paid",
      providerReference: args.providerReference,
      verifiedAt: now,
      updatedAt: now,
    });
    if (payment.propertyId !== undefined) {
      await ctx.db.patch(payment.propertyId, {
        workflowStatus: "paid",
        paymentStatus: "paid",
        paymentCompleted: true,
        updatedAt: now,
      });
    }
    if (payment.roommateRequestId !== undefined) {
      await ctx.db.patch(payment.roommateRequestId, {
        workflowStatus: "published",
        paymentStatus: "paid",
        publicationStatus: "approved",
        moderationStatus: "approved",
        reviewedAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});
