import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveProfile } from "./lib/authorization";
import { enqueueBusinessNotification, recordBusinessAudit } from "./lib/businessEvents";
import { bookingStatus } from "./validators";

const pricingPeriod = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("term"),
  v.literal("academic_year"),
  v.literal("yearly"),
);

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function bookingAmount(
  property: {
    price: number;
    rentalPrices?: {
      daily?: number;
      weekly?: number;
      monthly?: number;
      yearly?: number;
    };
  },
  period: "daily" | "weekly" | "monthly" | "term" | "academic_year" | "yearly",
) {
  const amount =
    period === "daily"
      ? property.rentalPrices?.daily
      : period === "weekly"
        ? property.rentalPrices?.weekly
        : period === "monthly"
          ? property.rentalPrices?.monthly
          : period === "yearly"
            ? property.rentalPrices?.yearly
            : property.price;
  if (amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("The selected pricing period is unavailable.");
  }
  return amount;
}

export const request = mutation({
  args: {
    propertyId: v.id("properties"),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    pricingPeriod,
    note: v.optional(v.string()),
  },
  returns: v.id("bookings"),
  handler: async (ctx, args) => {
    const requester = await requireActiveProfile(ctx);
    if (!validDate(args.startDate) || (args.endDate !== undefined && !validDate(args.endDate))) {
      throw new Error("Booking dates are invalid.");
    }
    if (args.endDate !== undefined && args.endDate < args.startDate) {
      throw new Error("Booking end date cannot precede the start date.");
    }
    const property = await ctx.db.get("properties", args.propertyId);
    if (
      property === null ||
      property.deletedAt !== undefined ||
      property.status !== "published" ||
      property.workflowStatus !== "published" ||
      property.publicationStatus !== "approved" ||
      property.availableUnits === 0
    ) {
      throw new Error("Property is not available for booking.");
    }
    const owner = await ctx.db.get("ownerProfiles", property.ownerProfileId);
    if (owner === null || owner.status !== "active") throw new Error("Property owner is inactive.");
    if (owner.userId === requester._id) throw new Error("Owners cannot book their own property.");
    for (const activeStatus of ["requested", "confirmed"] as const) {
      const duplicate = await ctx.db
        .query("bookings")
        .withIndex("by_requester_and_property_and_status", (q) =>
          q
            .eq("requesterUserId", requester._id)
            .eq("propertyId", property._id)
            .eq("status", activeStatus),
        )
        .unique();
      if (duplicate !== null) throw new Error("An active booking already exists.");
    }
    const amount = bookingAmount(property, args.pricingPeriod);
    const note = args.note?.trim().slice(0, 500);
    const now = Date.now();
    const bookingId = await ctx.db.insert("bookings", {
      propertyId: property._id,
      requesterUserId: requester._id,
      ownerProfileId: owner._id,
      status: "requested",
      startDate: args.startDate,
      endDate: args.endDate,
      pricingPeriod: args.pricingPeriod,
      amount,
      currency: "SAR",
      note: note || undefined,
      paymentStatus: "unpaid",
      createdAt: now,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: requester._id,
      actorType: "user",
      action: "booking.requested",
      entityType: "bookings",
      entityId: bookingId,
      reason: "User requested a booking",
      newValue: { status: "requested", propertyId: property._id, amount },
    });
    await enqueueBusinessNotification(ctx, {
      userId: owner.userId,
      idempotencyKey: `booking:${bookingId}:requested`,
      type: "booking.requested",
      title: "طلب حجز جديد",
      body: `وصل طلب حجز جديد للعقار: ${property.title}`,
      deepLink: "/owner/dashboard",
      relatedPropertyId: property._id,
    });
    return bookingId;
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(bookingStatus) },
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const source =
      args.status === undefined
        ? ctx.db
            .query("bookings")
            .withIndex("by_requester_and_status", (q) => q.eq("requesterUserId", profile._id))
        : ctx.db
            .query("bookings")
            .withIndex("by_requester_and_status", (q) =>
              q.eq("requesterUserId", profile._id).eq("status", args.status!),
            );
    return await source.order("desc").paginate(args.paginationOpts);
  },
});

export const listForOwner = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(bookingStatus) },
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const owner = await ctx.db
      .query("ownerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", profile._id))
      .unique();
    if (owner === null || owner.status !== "active") throw new Error("Active owner required.");
    const source =
      args.status === undefined
        ? ctx.db
            .query("bookings")
            .withIndex("by_owner_and_status", (q) => q.eq("ownerProfileId", owner._id))
        : ctx.db
            .query("bookings")
            .withIndex("by_owner_and_status", (q) =>
              q.eq("ownerProfileId", owner._id).eq("status", args.status!),
            );
    return await source.order("desc").paginate(args.paginationOpts);
  },
});

export const respond = mutation({
  args: {
    bookingId: v.id("bookings"),
    decision: v.union(v.literal("confirmed"), v.literal("rejected")),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const booking = await ctx.db.get("bookings", args.bookingId);
    if (booking === null) throw new Error("Booking not found.");
    const owner = await ctx.db.get("ownerProfiles", booking.ownerProfileId);
    if (owner?.userId !== profile._id || owner.status !== "active") {
      throw new Error("Only the property owner can respond.");
    }
    if (booking.status !== "requested") throw new Error("Booking is no longer pending.");
    const reason = args.reason?.trim().slice(0, 500);
    if (args.decision === "rejected" && !reason) throw new Error("A rejection reason is required.");
    const property = await ctx.db.get("properties", booking.propertyId);
    if (property === null) throw new Error("Property not found.");
    if (args.decision === "confirmed" && property.availableUnits === 0) {
      throw new Error("No units remain available.");
    }
    const now = Date.now();
    await ctx.db.patch(booking._id, {
      status: args.decision,
      ownerReason: reason || undefined,
      confirmedAt: args.decision === "confirmed" ? now : undefined,
      updatedAt: now,
    });
    if (args.decision === "confirmed" && property.availableUnits !== undefined) {
      const remaining = Math.max(0, property.availableUnits - 1);
      await ctx.db.patch(property._id, {
        availableUnits: remaining,
        availabilityStatus: remaining === 0 ? "full" : remaining <= 2 ? "nearly_full" : "available",
        updatedAt: now,
      });
    }
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: `booking.${args.decision}`,
      entityType: "bookings",
      entityId: booking._id,
      reason: reason || `Owner ${args.decision} booking`,
      previousValue: { status: booking.status },
      newValue: { status: args.decision },
    });
    await enqueueBusinessNotification(ctx, {
      userId: booking.requesterUserId,
      idempotencyKey: `booking:${booking._id}:${args.decision}`,
      type: `booking.${args.decision}`,
      title: args.decision === "confirmed" ? "تم تأكيد الحجز" : "تم رفض الحجز",
      body:
        args.decision === "confirmed"
          ? "وافق مالك العقار على طلب الحجز."
          : `تعذر قبول طلب الحجز${reason ? `: ${reason}` : "."}`,
      deepLink: "/user/dashboard",
      relatedPropertyId: property._id,
    });
    return null;
  },
});

export const cancel = mutation({
  args: { bookingId: v.id("bookings"), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const booking = await ctx.db.get("bookings", args.bookingId);
    if (booking === null || booking.requesterUserId !== profile._id) {
      throw new Error("Booking not found.");
    }
    if (booking.status !== "requested" && booking.status !== "confirmed") {
      throw new Error("Booking cannot be cancelled.");
    }
    const now = Date.now();
    await ctx.db.patch(booking._id, {
      status: "cancelled",
      cancelledAt: now,
      ownerReason: args.reason?.trim().slice(0, 500) || undefined,
      updatedAt: now,
    });
    const property = await ctx.db.get("properties", booking.propertyId);
    if (
      booking.status === "confirmed" &&
      property !== null &&
      property.availableUnits !== undefined
    ) {
      const available = Math.min(property.totalUnits ?? Infinity, property.availableUnits + 1);
      await ctx.db.patch(property._id, {
        availableUnits: available,
        availabilityStatus: available <= 2 ? "nearly_full" : "available",
        updatedAt: now,
      });
    }
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "booking.cancelled",
      entityType: "bookings",
      entityId: booking._id,
      reason: args.reason?.trim() || "Requester cancelled booking",
      previousValue: { status: booking.status },
      newValue: { status: "cancelled" },
    });
    const owner = await ctx.db.get("ownerProfiles", booking.ownerProfileId);
    if (owner !== null) {
      await enqueueBusinessNotification(ctx, {
        userId: owner.userId,
        idempotencyKey: `booking:${booking._id}:cancelled`,
        type: "booking.cancelled",
        title: "تم إلغاء الحجز",
        body: "ألغى طالب السكن طلب الحجز.",
        deepLink: "/owner/dashboard",
        relatedPropertyId: booking.propertyId,
      });
    }
    return null;
  },
});

export const complete = mutation({
  args: { bookingId: v.id("bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const booking = await ctx.db.get("bookings", args.bookingId);
    if (booking === null) throw new Error("Booking not found.");
    const owner = await ctx.db.get("ownerProfiles", booking.ownerProfileId);
    if (owner?.userId !== profile._id) throw new Error("Only the property owner can complete it.");
    if (booking.status !== "confirmed" || booking.paymentStatus !== "paid") {
      throw new Error("Only a paid confirmed booking can be completed.");
    }
    const now = Date.now();
    await ctx.db.patch(booking._id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "booking.completed",
      entityType: "bookings",
      entityId: booking._id,
      reason: "Property owner completed a paid booking",
      previousValue: { status: booking.status },
      newValue: { status: "completed" },
    });
    await enqueueBusinessNotification(ctx, {
      userId: booking.requesterUserId,
      idempotencyKey: `booking:${booking._id}:completed`,
      type: "booking.completed",
      title: "اكتمل الحجز",
      body: "تم تسجيل الحجز كمكتمل.",
      deepLink: "/user/dashboard",
      relatedPropertyId: booking.propertyId,
    });
    return null;
  },
});
