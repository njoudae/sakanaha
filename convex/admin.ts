import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/authorization";
import { moderationStatus, platformRole, profileStatus } from "./validators";

const COUNT_LIMIT = 1001;
const LIST_LIMIT = 100;
const SEARCH_LIMIT = 200;
const countResult = v.object({ value: v.number(), capped: v.boolean() });
const userResult = v.object({
  id: v.id("userProfiles"),
  name: v.string(),
  role: platformRole,
  status: profileStatus,
  city: v.optional(v.string()),
  createdAt: v.number(),
});
const propertyResult = v.object({
  id: v.id("properties"),
  title: v.string(),
  ownerName: v.string(),
  coverImage: v.optional(v.string()),
  region: v.optional(v.string()),
  city: v.string(),
  district: v.optional(v.string()),
  status: v.string(),
  moderationStatus,
  rejectionReason: v.optional(v.string()),
  price: v.number(),
  createdAt: v.number(),
  submittedAt: v.optional(v.number()),
});
const roommateResult = v.object({
  id: v.id("roommateRequests"),
  requesterName: v.string(),
  region: v.optional(v.string()),
  city: v.optional(v.string()),
  district: v.optional(v.string()),
  university: v.optional(v.string()),
  moderationStatus,
  rejectionReason: v.optional(v.string()),
  createdAt: v.number(),
  submittedAt: v.optional(v.number()),
});

function boundedCount<T>(rows: T[]) {
  return { value: Math.min(rows.length, COUNT_LIMIT - 1), capped: rows.length === COUNT_LIMIT };
}

export const overview = query({
  args: {},
  returns: v.object({
    users: countResult,
    owners: countResult,
    properties: countResult,
    roommateRequests: countResult,
    pendingPropertyApprovals: countResult,
    pendingRoommateApprovals: countResult,
    approved: countResult,
    rejected: countResult,
    archived: countResult,
    activeUsers: countResult,
    publishedProperties: countResult,
    openRoommateRequests: countResult,
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [users, owners, properties, roommateRequests, pendingProperties, pendingRoommates] =
      await Promise.all([
        ctx.db.query("userProfiles").order("desc").take(COUNT_LIMIT),
        ctx.db.query("ownerProfiles").order("desc").take(COUNT_LIMIT),
        ctx.db.query("properties").order("desc").take(COUNT_LIMIT),
        ctx.db.query("roommateRequests").order("desc").take(COUNT_LIMIT),
        ctx.db
          .query("properties")
          .withIndex("by_moderation_status", (q) => q.eq("moderationStatus", "pending"))
          .take(COUNT_LIMIT),
        ctx.db
          .query("roommateRequests")
          .withIndex("by_moderation_status", (q) => q.eq("moderationStatus", "pending"))
          .take(COUNT_LIMIT),
      ]);
    const liveProperties = properties.filter((item) => item.deletedAt === undefined);
    const liveRoommates = roommateRequests.filter((item) => item.deletedAt === undefined);
    const publicationStatuses = [
      ...liveProperties.map((item) => item.publicationStatus),
      ...liveRoommates.map((item) => item.publicationStatus),
    ];
    return {
      users: boundedCount(users.filter((item) => item.status !== "deleted")),
      owners: boundedCount(owners.filter((item) => item.status !== "deleted")),
      properties: boundedCount(liveProperties),
      roommateRequests: boundedCount(liveRoommates),
      pendingPropertyApprovals: boundedCount(
        pendingProperties.filter((item) => item.deletedAt === undefined),
      ),
      pendingRoommateApprovals: boundedCount(
        pendingRoommates.filter((item) => item.deletedAt === undefined),
      ),
      approved: boundedCount(publicationStatuses.filter((item) => item === "approved")),
      rejected: boundedCount(publicationStatuses.filter((item) => item === "rejected")),
      archived: boundedCount(publicationStatuses.filter((item) => item === "archived")),
      activeUsers: boundedCount(users.filter((item) => item.status === "active")),
      publishedProperties: boundedCount(
        liveProperties.filter(
          (item) => item.status === "published" && item.publicationStatus === "approved",
        ),
      ),
      openRoommateRequests: boundedCount(
        liveRoommates.filter(
          (item) => item.status === "open" && item.publicationStatus === "approved",
        ),
      ),
    };
  },
});

export const listUsers = query({
  args: {
    search: v.optional(v.string()),
    role: v.optional(platformRole),
    status: v.optional(profileStatus),
  },
  returns: v.array(userResult),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const search = args.search?.trim().toLocaleLowerCase().slice(0, 80) ?? "";
    const sourceLimit = search || (args.role && args.status) ? SEARCH_LIMIT : LIST_LIMIT;
    const rows = args.role
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_primary_role", (q) => q.eq("primaryRole", args.role!))
          .order("desc")
          .take(sourceLimit)
      : args.status
        ? await ctx.db
            .query("userProfiles")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .order("desc")
            .take(sourceLimit)
        : await ctx.db.query("userProfiles").order("desc").take(sourceLimit);
    return rows
      .filter((item) => args.status === undefined || item.status === args.status)
      .filter((item) => {
        if (!search) return true;
        return [item.name, item.city, item.primaryRole]
          .filter((value): value is string => typeof value === "string")
          .some((value) => value.toLocaleLowerCase().includes(search));
      })
      .slice(0, LIST_LIMIT)
      .map((item) => ({
        id: item._id,
        name: item.name,
        role: item.primaryRole,
        status: item.status,
        ...(item.city ? { city: item.city } : {}),
        createdAt: item.createdAt,
      }));
  },
});

export const listProperties = query({
  args: {
    search: v.optional(v.string()),
    moderation: v.optional(moderationStatus),
  },
  returns: v.array(propertyResult),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const search = args.search?.trim().slice(0, 80) ?? "";
    const rows = search
      ? await ctx.db
          .query("properties")
          .withSearchIndex("search_properties", (q) => q.search("searchText", search))
          .take(LIST_LIMIT)
      : args.moderation
        ? await ctx.db
            .query("properties")
            .withIndex("by_moderation_status", (q) => q.eq("moderationStatus", args.moderation!))
            .order("desc")
            .take(LIST_LIMIT)
        : await ctx.db.query("properties").order("desc").take(LIST_LIMIT);
    return await Promise.all(
      rows
        .filter((item) => item.deletedAt === undefined)
        .filter(
          (item) => args.moderation === undefined || item.moderationStatus === args.moderation,
        )
        .map(async (item) => {
          const [owner, cover] = await Promise.all([
            ctx.db.get("ownerProfiles", item.ownerProfileId),
            ctx.db
              .query("propertyMedia")
              .withIndex("by_property_and_cover", (q) =>
                q.eq("propertyId", item._id).eq("isCover", true),
              )
              .unique(),
          ]);
          const coverImage = cover?.storageId
            ? await ctx.storage.getUrl(cover.storageId)
            : cover?.legacyUrl;
          return {
            id: item._id,
            title: item.title,
            ownerName: owner?.fullName ?? "غير معروف",
            ...(coverImage ? { coverImage } : {}),
            ...(item.region ? { region: item.region } : {}),
            city: item.city,
            ...(item.district || item.neighborhood
              ? { district: item.district ?? item.neighborhood }
              : {}),
            status: item.status,
            moderationStatus: item.moderationStatus,
            ...(item.rejectionReason ? { rejectionReason: item.rejectionReason } : {}),
            price: item.price,
            createdAt: item.createdAt,
            ...(item.submittedAt ? { submittedAt: item.submittedAt } : {}),
          };
        }),
    );
  },
});

export const listRoommateRequests = query({
  args: { moderation: v.optional(moderationStatus) },
  returns: v.array(roommateResult),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = args.moderation
      ? await ctx.db
          .query("roommateRequests")
          .withIndex("by_moderation_status", (q) => q.eq("moderationStatus", args.moderation!))
          .order("desc")
          .take(LIST_LIMIT)
      : await ctx.db.query("roommateRequests").order("desc").take(LIST_LIMIT);
    return await Promise.all(
      rows
        .filter((item) => item.deletedAt === undefined)
        .map(async (item) => {
          const profile = await ctx.db.get("userProfiles", item.userId);
          return {
            id: item._id,
            requesterName: profile?.name ?? "مستخدمة",
            ...(item.region ? { region: item.region } : {}),
            ...(item.city ? { city: item.city } : {}),
            ...(item.district ? { district: item.district } : {}),
            ...(item.organization ? { university: item.organization } : {}),
            moderationStatus: item.moderationStatus,
            ...(item.rejectionReason ? { rejectionReason: item.rejectionReason } : {}),
            createdAt: item.createdAt,
            ...(item.submittedAt ? { submittedAt: item.submittedAt } : {}),
          };
        }),
    );
  },
});

export const updateUserStatus = mutation({
  args: { userId: v.id("userProfiles"), status: profileStatus },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get("userProfiles", args.userId);
    if (target === null) throw new Error("User not found.");
    if (target._id === admin._id && args.status !== "active") {
      throw new Error("An administrator cannot suspend their own account.");
    }
    if (target.primaryRole === "admin" && target.status === "active" && args.status !== "active") {
      const activeAdmins = await ctx.db
        .query("userProfiles")
        .withIndex("by_primary_role", (q) => q.eq("primaryRole", "admin"))
        .take(2);
      if (activeAdmins.filter((item) => item.status === "active").length <= 1) {
        throw new Error("The last active administrator cannot be suspended or deleted.");
      }
    }
    const now = Date.now();
    await ctx.db.patch(target._id, { status: args.status, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      actorUserId: admin._id,
      actorType: "admin",
      action: "admin.user.status_updated",
      entity: `userProfiles:${target._id}`,
      targetTable: "userProfiles",
      targetId: target._id,
      metadata: { status: args.status },
      adminId: admin._id,
      entityType: "user",
      entityId: target._id,
      timestamp: now,
      reason: "Administrative user status update",
      previousValue: { status: target.status },
      newValue: { status: args.status },
      createdAt: now,
    });
    return null;
  },
});

function reasonRequired(
  moderation: "pending" | "approved" | "rejected" | "needs_review" | "archived",
) {
  return moderation === "rejected" || moderation === "needs_review";
}

export const moderateProperty = mutation({
  args: {
    propertyId: v.id("properties"),
    moderation: moderationStatus,
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const property = await ctx.db.get("properties", args.propertyId);
    if (property === null || property.deletedAt !== undefined) {
      throw new Error("Property not found.");
    }
    if (reasonRequired(args.moderation) && !args.reason?.trim()) {
      throw new Error("A rejection or change-request reason is required.");
    }
    const now = Date.now();
    const approved = args.moderation === "approved";
    const archived = args.moderation === "archived";
    await ctx.db.patch(property._id, {
      moderationStatus: args.moderation,
      publicationStatus: approved
        ? "approved"
        : archived
          ? "archived"
          : args.moderation === "pending"
            ? "pending_review"
            : "rejected",
      status: approved
        ? "published"
        : archived
          ? "archived"
          : reasonRequired(args.moderation)
            ? "rejected"
            : "pending_review",
      workflowStatus: approved
        ? "published"
        : archived
          ? "archived"
          : args.moderation === "needs_review"
            ? "changes_requested"
            : args.moderation === "rejected"
              ? "rejected"
              : "pending_admin_review",
      rejectionReason: reasonRequired(args.moderation) ? args.reason!.trim() : undefined,
      reviewedAt: now,
      reviewedByUserId: admin._id,
      publishedAt: approved ? now : property.publishedAt,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: admin._id,
      actorType: "admin",
      action: "admin.property.moderated",
      entity: `properties:${property._id}`,
      targetTable: "properties",
      targetId: property._id,
      metadata: { moderationStatus: args.moderation, reason: args.reason },
      adminId: admin._id,
      entityType: "property",
      entityId: property._id,
      timestamp: now,
      reason: args.reason?.trim() || `Property ${args.moderation}`,
      previousValue: {
        workflowStatus: property.workflowStatus ?? property.publicationStatus,
        moderationStatus: property.moderationStatus,
      },
      newValue: {
        workflowStatus: approved ? "published" : archived ? "archived" : args.moderation,
        moderationStatus: args.moderation,
      },
      createdAt: now,
    });
    return null;
  },
});

export const moderateRoommateRequest = mutation({
  args: {
    requestId: v.id("roommateRequests"),
    moderation: moderationStatus,
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const request = await ctx.db.get("roommateRequests", args.requestId);
    if (request === null || request.deletedAt !== undefined) {
      throw new Error("Roommate request not found.");
    }
    if (reasonRequired(args.moderation) && !args.reason?.trim()) {
      throw new Error("A rejection or change-request reason is required.");
    }
    const now = Date.now();
    await ctx.db.patch(request._id, {
      moderationStatus: args.moderation,
      publicationStatus:
        args.moderation === "approved"
          ? "approved"
          : args.moderation === "archived"
            ? "archived"
            : args.moderation === "pending"
              ? "pending_review"
              : "rejected",
      rejectionReason: reasonRequired(args.moderation) ? args.reason!.trim() : undefined,
      reviewedAt: now,
      reviewedByUserId: admin._id,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: admin._id,
      adminId: admin._id,
      actorType: "admin",
      action: "admin.roommate_request.moderated",
      entity: `roommateRequests:${request._id}`,
      targetTable: "roommateRequests",
      targetId: request._id,
      entityType: "roommate_card",
      entityId: request._id,
      timestamp: now,
      reason: args.reason?.trim() || `Roommate card ${args.moderation}`,
      previousValue: {
        workflowStatus: request.workflowStatus ?? request.publicationStatus,
        moderationStatus: request.moderationStatus,
      },
      newValue: { moderationStatus: args.moderation },
      metadata: { moderationStatus: args.moderation, reason: args.reason },
      createdAt: now,
    });
    return null;
  },
});

export const deleteProperty = mutation({
  args: { propertyId: v.id("properties") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const property = await ctx.db.get("properties", args.propertyId);
    if (property === null) throw new Error("Property not found.");
    const now = Date.now();
    await ctx.db.patch(property._id, {
      deletedAt: now,
      status: "archived",
      workflowStatus: "archived",
      publicationStatus: "archived",
      moderationStatus: "archived",
      reviewedAt: now,
      reviewedByUserId: admin._id,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: admin._id,
      adminId: admin._id,
      actorType: "admin",
      action: "admin.property.deleted",
      entity: `properties:${property._id}`,
      targetTable: "properties",
      targetId: property._id,
      entityType: "property",
      entityId: property._id,
      timestamp: now,
      reason: "Administrative soft delete",
      previousValue: { workflowStatus: property.workflowStatus ?? property.publicationStatus },
      newValue: { workflowStatus: "archived", deletedAt: now },
      createdAt: now,
    });
    return null;
  },
});

export const deleteRoommateRequest = mutation({
  args: { requestId: v.id("roommateRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const request = await ctx.db.get("roommateRequests", args.requestId);
    if (request === null) throw new Error("Roommate request not found.");
    const now = Date.now();
    await ctx.db.patch(request._id, {
      deletedAt: now,
      workflowStatus: "deleted",
      publicationStatus: "archived",
      moderationStatus: "archived",
      reviewedAt: now,
      reviewedByUserId: admin._id,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: admin._id,
      adminId: admin._id,
      actorType: "admin",
      action: "admin.roommate_request.deleted",
      entity: `roommateRequests:${request._id}`,
      targetTable: "roommateRequests",
      targetId: request._id,
      entityType: "roommate_card",
      entityId: request._id,
      timestamp: now,
      reason: "Administrative soft delete",
      previousValue: { workflowStatus: request.workflowStatus ?? request.publicationStatus },
      newValue: { workflowStatus: "deleted", deletedAt: now },
      createdAt: now,
    });
    return null;
  },
});

export const setPropertyOperationalStatus = mutation({
  args: {
    propertyId: v.id("properties"),
    status: v.union(v.literal("suspended"), v.literal("archived"), v.literal("published")),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const property = await ctx.db.get("properties", args.propertyId);
    if (property === null) throw new Error("Property not found.");
    const reason = args.reason.trim();
    if (!reason) throw new Error("A reason is required.");
    if (args.status === "published" && property.workflowStatus !== "suspended") {
      throw new Error("Only a suspended property can be restored to published.");
    }
    const now = Date.now();
    await ctx.db.patch(property._id, {
      workflowStatus: args.status,
      status: args.status === "suspended" ? "paused" : args.status,
      publicationStatus: args.status === "published" ? "approved" : "archived",
      deletedAt: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: admin._id,
      adminId: admin._id,
      actorType: "admin",
      action: `admin.property.${args.status}`,
      entity: `properties:${property._id}`,
      targetTable: "properties",
      targetId: property._id,
      entityType: "property",
      entityId: property._id,
      timestamp: now,
      reason,
      previousValue: { workflowStatus: property.workflowStatus ?? property.publicationStatus },
      newValue: { workflowStatus: args.status },
      createdAt: now,
    });
    return null;
  },
});

export const setRoommateCardOperationalStatus = mutation({
  args: {
    requestId: v.id("roommateRequests"),
    status: v.union(
      v.literal("published"),
      v.literal("suspended"),
      v.literal("hidden"),
      v.literal("deleted"),
    ),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const request = await ctx.db.get("roommateRequests", args.requestId);
    if (request === null) throw new Error("Roommate card not found.");
    const reason = args.reason.trim();
    if (!reason) throw new Error("A reason is required.");
    const now = Date.now();
    await ctx.db.patch(request._id, {
      workflowStatus: args.status,
      status: args.status === "published" ? "open" : "hidden",
      publicationStatus: args.status === "published" ? "approved" : "archived",
      deletedAt: args.status === "deleted" ? now : undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: admin._id,
      adminId: admin._id,
      actorType: "admin",
      action: `admin.roommate_card.${args.status}`,
      entity: `roommateRequests:${request._id}`,
      targetTable: "roommateRequests",
      targetId: request._id,
      entityType: "roommate_card",
      entityId: request._id,
      timestamp: now,
      reason,
      previousValue: { workflowStatus: request.workflowStatus ?? request.publicationStatus },
      newValue: { workflowStatus: args.status },
      createdAt: now,
    });
    return null;
  },
});
