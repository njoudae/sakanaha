import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { notificationPriority } from "./validators";
import {
  DEFAULT_NOTIFICATION_CHANNELS,
  MAX_NOTIFICATION_ATTEMPTS,
  NOTIFICATION_BATCH_SIZE,
  NOTIFICATION_LEASE_MS,
  normalizeNotificationDeepLink,
  notificationRetryDelayMs,
  validateNotificationContent,
} from "./notificationSupport";

const relatedArgs = {
  relatedPropertyId: v.optional(v.id("properties")),
  relatedOwnerProfileId: v.optional(v.id("ownerProfiles")),
  relatedServiceProviderProfileId: v.optional(v.id("serviceProviderProfiles")),
  relatedServiceRequestId: v.optional(v.id("serviceRequests")),
};

export const enqueue = internalMutation({
  args: {
    userId: v.id("userProfiles"),
    idempotencyKey: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    deepLink: v.optional(v.string()),
    data: v.optional(v.any()),
    priority: notificationPriority,
    ...relatedArgs,
  },
  handler: async (ctx, args) => {
    const content = validateNotificationContent(args);
    const deepLink = normalizeNotificationDeepLink(args.deepLink);
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", content.idempotencyKey))
      .unique();
    if (existing !== null) return { notificationId: existing._id, duplicate: true };

    const user = await ctx.db.get("userProfiles", args.userId);
    if (user === null || user.status !== "active")
      throw new Error("Active notification recipient required.");
    const preferences = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    const channels = preferences?.channels ?? DEFAULT_NOTIFICATION_CHANNELS;
    const eventEnabled = preferences?.eventTypes?.[content.type] ?? true;
    const now = Date.now();
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      idempotencyKey: content.idempotencyKey,
      relatedPropertyId: args.relatedPropertyId,
      relatedOwnerProfileId: args.relatedOwnerProfileId,
      relatedServiceProviderProfileId: args.relatedServiceProviderProfileId,
      relatedServiceRequestId: args.relatedServiceRequestId,
      type: content.type,
      title: content.title,
      body: content.body,
      data:
        deepLink === undefined && args.data === undefined
          ? undefined
          : { deepLink, metadata: args.data },
      status: eventEnabled && channels.inApp ? "unread" : "archived",
      priority: args.priority,
      createdAt: now,
    });

    const deliveries: Array<{
      channel: "inApp" | "email" | "sms";
      enabled: boolean;
      hasDestination: boolean;
    }> = [
      { channel: "inApp", enabled: channels.inApp, hasDestination: true },
      { channel: "email", enabled: channels.email, hasDestination: user.email !== undefined },
      { channel: "sms", enabled: channels.sms, hasDestination: user.phone !== undefined },
    ];
    let pending = false;
    for (const delivery of deliveries) {
      const shouldDeliver = eventEnabled && delivery.enabled && delivery.hasDestination;
      const external = delivery.channel !== "inApp";
      const deliveryIdempotencyKey = `${content.idempotencyKey}:${delivery.channel}`;
      await ctx.db.insert("notificationDeliveries", {
        notificationId,
        userId: args.userId,
        idempotencyKey: deliveryIdempotencyKey,
        channel: delivery.channel,
        status: shouldDeliver ? (external ? "pending" : "sent") : "skipped",
        attemptCount: 0,
        lastError: shouldDeliver
          ? undefined
          : !eventEnabled
            ? "event_disabled"
            : !delivery.enabled
              ? "channel_disabled"
              : "destination_missing",
        nextAttemptAt: shouldDeliver && external ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });
      pending ||= shouldDeliver && external;
    }

    if (pending) await ctx.scheduler.runAfter(0, internal.notificationDelivery.processDue, {});
    return { notificationId, duplicate: false };
  },
});

export const due = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const deliveries = await ctx.db
      .query("notificationDeliveries")
      .withIndex("by_status_next_attempt", (q) =>
        q.eq("status", "pending").lte("nextAttemptAt", args.now),
      )
      .take(NOTIFICATION_BATCH_SIZE);
    return deliveries.map((delivery) => delivery._id);
  },
});

export const claim = internalMutation({
  args: { deliveryId: v.id("notificationDeliveries"), now: v.number() },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("notificationDeliveries", args.deliveryId);
    if (
      delivery === null ||
      delivery.status !== "pending" ||
      delivery.nextAttemptAt === undefined ||
      delivery.nextAttemptAt > args.now
    ) {
      return null;
    }
    await ctx.db.patch(delivery._id, {
      attemptCount: delivery.attemptCount + 1,
      nextAttemptAt: args.now + NOTIFICATION_LEASE_MS,
      updatedAt: args.now,
    });
    return { ...delivery, attemptCount: delivery.attemptCount + 1 };
  },
});

export const context = internalQuery({
  args: { deliveryId: v.id("notificationDeliveries") },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("notificationDeliveries", args.deliveryId);
    if (delivery === null) return null;
    const notification = await ctx.db.get("notifications", delivery.notificationId);
    const user = await ctx.db.get("userProfiles", delivery.userId);
    const preferences = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", delivery.userId))
      .unique();
    if (notification === null || user === null) return null;
    const data = notification.data as { deepLink?: unknown } | undefined;
    return {
      delivery,
      notification: {
        title: notification.title,
        body: notification.body,
        deepLink: typeof data?.deepLink === "string" ? data.deepLink : undefined,
      },
      destination:
        delivery.channel === "email"
          ? user.email
          : delivery.channel === "sms"
            ? user.phone
            : undefined,
      quietHours: preferences?.quietHours,
    };
  },
});

export const complete = internalMutation({
  args: {
    deliveryId: v.id("notificationDeliveries"),
    provider: v.string(),
    providerMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("notificationDeliveries", args.deliveryId);
    if (delivery === null || delivery.status !== "pending") return null;
    const now = Date.now();
    await ctx.db.patch(delivery._id, {
      provider: args.provider,
      providerMessageId: args.providerMessageId,
      status: "sent",
      lastError: undefined,
      nextAttemptAt: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("providerUsageEvents", {
      provider: args.provider,
      capability: delivery.channel === "email" ? "email" : "sms",
      operation: "notification_send",
      relatedUserId: delivery.userId,
      unitCount: 1,
      status: "success",
      metadata: { notificationId: delivery.notificationId, deliveryId: delivery._id },
      createdAt: now,
    });
    return null;
  },
});

export const releaseForQuietHours = internalMutation({
  args: { deliveryId: v.id("notificationDeliveries"), nextAttemptAt: v.number() },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("notificationDeliveries", args.deliveryId);
    if (delivery === null || delivery.status !== "pending") return null;
    await ctx.db.patch(delivery._id, {
      attemptCount: Math.max(0, delivery.attemptCount - 1),
      nextAttemptAt: args.nextAttemptAt,
      lastError: "quiet_hours",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const failOrRetry = internalMutation({
  args: {
    deliveryId: v.id("notificationDeliveries"),
    provider: v.optional(v.string()),
    errorCode: v.string(),
    temporary: v.boolean(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("notificationDeliveries", args.deliveryId);
    if (delivery === null || delivery.status !== "pending") return null;
    const now = Date.now();
    const exhausted = !args.temporary || delivery.attemptCount >= MAX_NOTIFICATION_ATTEMPTS;
    await ctx.db.patch(delivery._id, {
      provider: args.provider,
      status: exhausted ? "failed" : "pending",
      lastError: args.errorCode.slice(0, 160),
      nextAttemptAt: exhausted ? undefined : now + notificationRetryDelayMs(delivery.attemptCount),
      updatedAt: now,
    });
    if (exhausted) {
      await ctx.db.insert("auditEvents", {
        actorType: "system",
        action: "notifications.delivery.failed",
        targetTable: "notificationDeliveries",
        targetId: delivery._id,
        metadata: {
          notificationId: delivery.notificationId,
          channel: delivery.channel,
          provider: args.provider,
          attemptCount: delivery.attemptCount,
          errorCode: args.errorCode.slice(0, 160),
        },
        createdAt: now,
      });
      await ctx.db.insert("providerUsageEvents", {
        provider: args.provider ?? "unconfigured",
        capability: delivery.channel === "email" ? "email" : "sms",
        operation: "notification_send",
        relatedUserId: delivery.userId,
        unitCount: 1,
        status: "failed",
        metadata: { notificationId: delivery.notificationId, deliveryId: delivery._id },
        createdAt: now,
      });
    }
    return { exhausted };
  },
});

export type ClaimedNotificationDelivery = Doc<"notificationDeliveries"> & { attemptCount: number };
export type NotificationDeliveryId = Id<"notificationDeliveries">;
