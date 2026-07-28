import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { notificationChannels, notificationStatus, quietHours } from "./validators";
import {
  DEFAULT_NOTIFICATION_CHANNELS,
  normalizeNotificationDeepLink,
  validateQuietHours,
} from "./notificationSupport";

async function currentProfile(ctx: QueryCtx | MutationCtx) {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId === null) throw new Error("Authentication required.");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
  if (profile === null || profile.status !== "active") throw new Error("Active profile required.");
  return profile;
}

function publicNotification(notification: Doc<"notifications">) {
  const data = notification.data as { deepLink?: unknown } | undefined;
  let deepLink: string | undefined;
  if (typeof data?.deepLink === "string") {
    try {
      deepLink = normalizeNotificationDeepLink(data.deepLink);
    } catch {
      deepLink = undefined;
    }
  }
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    status: notification.status,
    priority: notification.priority,
    deepLink,
    relatedPropertyId: notification.relatedPropertyId,
    relatedServiceRequestId: notification.relatedServiceRequestId,
    createdAt: notification.createdAt,
    readAt: notification.readAt,
  };
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(notificationStatus),
  },
  handler: async (ctx, args) => {
    const profile = await currentProfile(ctx);
    const result =
      args.status === undefined
        ? await ctx.db
            .query("notifications")
            .withIndex("by_user_created", (q) => q.eq("userId", profile._id))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("notifications")
            .withIndex("by_user_status_created", (q) =>
              q.eq("userId", profile._id).eq("status", args.status!),
            )
            .order("desc")
            .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(publicNotification) };
  },
});

export const unreadSummary = query({
  args: {},
  handler: async (ctx) => {
    const profile = await currentProfile(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_status_created", (q) =>
        q.eq("userId", profile._id).eq("status", "unread"),
      )
      .order("desc")
      .take(101);
    return { count: Math.min(unread.length, 100), hasMore: unread.length > 100 };
  },
});

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const profile = await currentProfile(ctx);
    const preferences = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", profile._id))
      .unique();
    return {
      channels: preferences?.channels ?? DEFAULT_NOTIFICATION_CHANNELS,
      eventTypes: preferences?.eventTypes ?? {},
      quietHours: preferences?.quietHours,
    };
  },
});

export const updatePreferences = mutation({
  args: {
    channels: notificationChannels,
    eventTypes: v.optional(v.record(v.string(), v.boolean())),
    quietHours: v.optional(quietHours),
  },
  handler: async (ctx, args) => {
    const profile = await currentProfile(ctx);
    const eventTypes = args.eventTypes ?? {};
    const eventEntries = Object.entries(eventTypes);
    if (
      eventEntries.length > 50 ||
      eventEntries.some(([key]) => !/^[a-z][a-z0-9_.-]{1,79}$/.test(key))
    ) {
      throw new Error("Invalid notification event preferences.");
    }
    const normalizedQuietHours = validateQuietHours(args.quietHours);
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", profile._id))
      .unique();
    const now = Date.now();
    if (existing === null) {
      await ctx.db.insert("notificationPreferences", {
        userId: profile._id,
        channels: args.channels,
        eventTypes,
        quietHours: normalizedQuietHours,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        channels: args.channels,
        eventTypes,
        quietHours: normalizedQuietHours,
        updatedAt: now,
      });
    }
    await ctx.db.insert("auditEvents", {
      actorUserId: profile._id,
      actorType: "user",
      action: "notifications.preferences.updated",
      metadata: {
        inApp: args.channels.inApp,
        email: args.channels.email,
        sms: args.channels.sms,
        push: args.channels.push,
        eventTypeCount: eventEntries.length,
        hasQuietHours: normalizedQuietHours !== undefined,
      },
      createdAt: now,
    });
    return null;
  },
});

async function ownedNotification(ctx: MutationCtx, notificationId: Doc<"notifications">["_id"]) {
  const profile = await currentProfile(ctx);
  const notification = await ctx.db.get("notifications", notificationId);
  if (notification === null || notification.userId !== profile._id) {
    throw new Error("Notification not found.");
  }
  return notification;
}

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ownedNotification(ctx, args.notificationId);
    if (notification.status === "unread") {
      await ctx.db.patch(notification._id, { status: "read", readAt: Date.now() });
    }
    return null;
  },
});

export const markUnread = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ownedNotification(ctx, args.notificationId);
    if (notification.status !== "unread") {
      await ctx.db.patch(notification._id, { status: "unread", readAt: undefined });
    }
    return null;
  },
});

export const archive = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ownedNotification(ctx, args.notificationId);
    if (notification.status !== "archived") {
      await ctx.db.patch(notification._id, { status: "archived" });
    }
    return null;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await currentProfile(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_status_created", (q) =>
        q.eq("userId", profile._id).eq("status", "unread"),
      )
      .take(100);
    const now = Date.now();
    for (const notification of unread) {
      await ctx.db.patch(notification._id, { status: "read", readAt: now });
    }
    return { updated: unread.length, hasMore: unread.length === 100 };
  },
});
