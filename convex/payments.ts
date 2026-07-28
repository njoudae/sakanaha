import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireActiveProfile } from "./lib/authorization";
import { enqueueBusinessNotification, recordBusinessAudit } from "./lib/businessEvents";
import { paymentEntityType, paymentStatus } from "./validators";

const PUBLICATION_FEES = {
  property: 150,
  roommate_card: 15,
} as const;

export const createIntent = mutation({
  args: {
    entityType: paymentEntityType,
    propertyId: v.optional(v.id("properties")),
    roommateRequestId: v.optional(v.id("roommateRequests")),
    bookingId: v.optional(v.id("bookings")),
    idempotencyKey: v.string(),
  },
  returns: v.id("payments"),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const idempotencyKey = args.idempotencyKey.trim();
    if (!/^[A-Za-z0-9._:-]{16,160}$/.test(idempotencyKey)) {
      throw new Error("A valid idempotency key is required.");
    }
    const targetCount =
      Number(args.propertyId !== undefined) +
      Number(args.roommateRequestId !== undefined) +
      Number(args.bookingId !== undefined);
    if (targetCount !== 1) throw new Error("Exactly one payment target is required.");
    let amount: number;
    if (args.entityType === "property" && args.propertyId !== undefined) {
      const property = await ctx.db.get("properties", args.propertyId);
      const owner = property && (await ctx.db.get("ownerProfiles", property.ownerProfileId));
      if (property === null || owner?.userId !== profile._id) {
        throw new Error("Payment target is not owned by you.");
      }
      amount = PUBLICATION_FEES.property;
    } else if (args.entityType === "roommate_card" && args.roommateRequestId !== undefined) {
      const card = await ctx.db.get("roommateRequests", args.roommateRequestId);
      if (card === null || card.userId !== profile._id) {
        throw new Error("Payment target is not owned by you.");
      }
      amount = PUBLICATION_FEES.roommate_card;
    } else if (args.entityType === "booking" && args.bookingId !== undefined) {
      const booking = await ctx.db.get("bookings", args.bookingId);
      if (
        booking === null ||
        booking.requesterUserId !== profile._id ||
        booking.status !== "confirmed"
      ) {
        throw new Error("Only a confirmed booking can be paid by its requester.");
      }
      amount = booking.amount;
    } else {
      throw new Error("The payment target does not match its entity type.");
    }
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .unique();
    if (existing !== null) {
      if (
        existing.userId !== profile._id ||
        existing.entityType !== args.entityType ||
        existing.propertyId !== args.propertyId ||
        existing.roommateRequestId !== args.roommateRequestId ||
        existing.bookingId !== args.bookingId
      ) {
        throw new Error("Idempotency key belongs to another payment.");
      }
      return existing._id;
    }
    const now = Date.now();
    const paymentId = await ctx.db.insert("payments", {
      userId: profile._id,
      entityType: args.entityType,
      propertyId: args.propertyId,
      roommateRequestId: args.roommateRequestId,
      bookingId: args.bookingId,
      provider: "unconfigured",
      idempotencyKey,
      amount,
      currency: "SAR",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "payment.intent.created",
      entityType: "payments",
      entityId: paymentId,
      reason: "Payment intent created without provider integration",
      newValue: { entityType: args.entityType, amount, currency: "SAR", status: "pending" },
    });
    return paymentId;
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(paymentStatus) },
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const source =
      args.status === undefined
        ? ctx.db
            .query("payments")
            .withIndex("by_user_and_status", (q) => q.eq("userId", profile._id))
        : ctx.db
            .query("payments")
            .withIndex("by_user_and_status", (q) =>
              q.eq("userId", profile._id).eq("status", args.status!),
            );
    return await source.order("desc").paginate(args.paginationOpts);
  },
});

export const recordStatus = internalMutation({
  args: {
    idempotencyKey: v.string(),
    status: v.union(
      v.literal("paid"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("refunded"),
    ),
    provider: v.string(),
    providerReference: v.optional(v.string()),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (payment === null) throw new Error("Payment intent not found.");
    if (payment.status === args.status) return null;
    if (payment.status === "paid" && args.status !== "refunded") {
      throw new Error("A paid payment can only transition to refunded.");
    }
    if (payment.status === "refunded") throw new Error("A refunded payment is final.");
    const reason = args.reason.trim().slice(0, 500);
    if (!reason) throw new Error("A payment transition reason is required.");
    const now = Date.now();
    await ctx.db.patch(payment._id, {
      status: args.status,
      provider: args.provider.trim().slice(0, 80),
      providerReference: args.providerReference?.trim().slice(0, 200),
      verifiedAt: args.status === "paid" ? now : payment.verifiedAt,
      updatedAt: now,
    });
    if (args.status === "paid" && payment.propertyId !== undefined) {
      await ctx.db.patch(payment.propertyId, {
        workflowStatus: "paid",
        paymentStatus: "paid",
        paymentCompleted: true,
        updatedAt: now,
      });
    }
    if (args.status === "paid" && payment.roommateRequestId !== undefined) {
      await ctx.db.patch(payment.roommateRequestId, {
        workflowStatus: "paid",
        paymentStatus: "paid",
        updatedAt: now,
      });
    }
    if (payment.bookingId !== undefined) {
      await ctx.db.patch(payment.bookingId, {
        paymentStatus: args.status,
        updatedAt: now,
      });
    }
    await ctx.db.insert("auditEvents", {
      actorType: "system",
      action: `payment.${args.status}`,
      entity: `payments:${payment._id}`,
      targetTable: "payments",
      targetId: payment._id,
      entityType: "payments",
      entityId: payment._id,
      timestamp: now,
      reason,
      previousValue: { status: payment.status },
      newValue: { status: args.status, provider: args.provider },
      createdAt: now,
    });
    await enqueueBusinessNotification(ctx, {
      userId: payment.userId,
      idempotencyKey: `payment:${payment._id}:${args.status}`,
      type: `payment.${args.status}`,
      title: args.status === "paid" ? "تم تأكيد الدفع" : "تحديث حالة الدفع",
      body:
        args.status === "paid"
          ? `تم تأكيد دفع ${payment.amount} ${payment.currency}.`
          : `تم تحديث حالة الدفع إلى ${args.status}.`,
      deepLink: "/user/dashboard",
      relatedPropertyId: payment.propertyId,
    });
    return null;
  },
});
