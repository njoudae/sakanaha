import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireActiveProfile } from "./lib/authorization";
import { enqueueBusinessNotification, recordBusinessAudit } from "./lib/businessEvents";
import { userType } from "./validators";

const preferences = v.object({
  smoking: v.union(v.literal("yes"), v.literal("no")),
  guests: v.union(
    v.literal("never"),
    v.literal("occasionally"),
    v.literal("frequently"),
    v.literal("no_preference"),
  ),
  sleep: v.union(v.literal("early"), v.literal("flexible"), v.literal("late")),
  cleanliness: v.union(v.literal("very_tidy"), v.literal("average"), v.literal("no_preference")),
  pets: v.union(v.literal("allowed"), v.literal("not_allowed")),
  cooking: v.union(v.literal("frequently"), v.literal("occasionally"), v.literal("rarely")),
  occupation: v.union(v.literal("student"), v.literal("employee"), v.literal("both")),
  noise: v.union(v.literal("quiet"), v.literal("moderate"), v.literal("no_preference")),
});
const externalHousing = v.object({
  city: v.string(),
  district: v.string(),
  approximateLocation: v.optional(v.string()),
  nearbyLandmarks: v.optional(v.array(v.string())),
  approximateLat: v.optional(v.number()),
  approximateLng: v.optional(v.number()),
});
const editableFields = {
  source: v.union(v.literal("saknaha_property"), v.literal("external_property")),
  linkedPropertyId: v.optional(v.id("properties")),
  externalHousing: v.optional(externalHousing),
  userType,
  age: v.number(),
  organization: v.string(),
  major: v.optional(v.string()),
  moveInDate: v.string(),
  bio: v.string(),
  availableRooms: v.number(),
  pricePerPerson: v.number(),
  preferences,
  region: v.optional(v.string()),
  city: v.optional(v.string()),
  district: v.optional(v.string()),
  landmark: v.optional(v.string()),
};

function normalize(args: {
  source: "saknaha_property" | "external_property";
  linkedPropertyId?: string;
  externalHousing?: {
    city: string;
    district: string;
    approximateLocation?: string;
    nearbyLandmarks?: string[];
    approximateLat?: number;
    approximateLng?: number;
  };
  age: number;
  organization: string;
  major?: string;
  moveInDate: string;
  bio: string;
  availableRooms: number;
  pricePerPerson: number;
  region?: string;
  city?: string;
  district?: string;
  landmark?: string;
}) {
  if (!Number.isSafeInteger(args.age) || args.age < 18 || args.age > 100) {
    throw new Error("Age must be between 18 and 100.");
  }
  if (!Number.isSafeInteger(args.availableRooms) || args.availableRooms < 1) {
    throw new Error("At least one available room is required.");
  }
  if (!Number.isFinite(args.pricePerPerson) || args.pricePerPerson <= 0) {
    throw new Error("Price per person must be positive.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.moveInDate)) {
    throw new Error("Move-in date is invalid.");
  }
  const organization = args.organization.trim().slice(0, 160);
  const bio = args.bio.trim().slice(0, 1000);
  if (!organization || !bio) throw new Error("Organization and description are required.");
  if (args.source === "external_property") {
    if (args.linkedPropertyId !== undefined) {
      throw new Error("External housing cannot be linked to a platform property.");
    }
    if (!args.externalHousing?.city.trim() || !args.externalHousing.district.trim()) {
      throw new Error("External housing city and district are required.");
    }
  } else if (args.linkedPropertyId === undefined || args.externalHousing !== undefined) {
    throw new Error("A platform housing card must reference one platform property only.");
  }
  return {
    organization,
    bio,
    major: args.major?.trim().slice(0, 160) || undefined,
    region: args.region?.trim().slice(0, 100) || undefined,
    city: args.city?.trim().slice(0, 100) || args.externalHousing?.city.trim(),
    district: args.district?.trim().slice(0, 120) || args.externalHousing?.district.trim(),
    landmark: args.landmark?.trim().slice(0, 160) || undefined,
    externalHousing:
      args.externalHousing === undefined
        ? undefined
        : {
            city: args.externalHousing.city.trim().slice(0, 100),
            district: args.externalHousing.district.trim().slice(0, 120),
            approximateLocation:
              args.externalHousing.approximateLocation?.trim().slice(0, 300) || undefined,
            nearbyLandmarks: args.externalHousing.nearbyLandmarks
              ?.map((item) => item.trim().slice(0, 160))
              .filter(Boolean)
              .slice(0, 20),
            approximateLat: args.externalHousing.approximateLat,
            approximateLng: args.externalHousing.approximateLng,
          },
  };
}

async function validateLinkedProperty(
  ctx: Parameters<typeof requireActiveProfile>[0],
  propertyId: Id<"properties"> | undefined,
) {
  if (propertyId === undefined) return;
  const property = await ctx.db.get("properties", propertyId);
  if (
    property === null ||
    property.deletedAt !== undefined ||
    property.status !== "published" ||
    property.publicationStatus !== "approved" ||
    !property.roommateAllowed
  ) {
    throw new Error("Linked property is unavailable for roommate sharing.");
  }
}

export const createDraft = mutation({
  args: editableFields,
  returns: v.id("roommateRequests"),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const normalized = normalize(args);
    await validateLinkedProperty(ctx, args.linkedPropertyId);
    const now = Date.now();
    const requestId = await ctx.db.insert("roommateRequests", {
      userId: profile._id,
      source: args.source,
      linkedPropertyId: args.linkedPropertyId,
      userType: args.userType,
      age: args.age,
      organization: normalized.organization,
      major: normalized.major,
      moveInDate: args.moveInDate,
      bio: normalized.bio,
      availableRooms: args.availableRooms,
      pricePerPerson: args.pricePerPerson,
      preferences: args.preferences,
      region: normalized.region,
      city: normalized.city,
      district: normalized.district,
      landmark: normalized.landmark,
      externalHousing: normalized.externalHousing,
      workflowStatus: "draft",
      paymentStatus: "unpaid",
      publicationStatus: "draft",
      status: "hidden",
      moderationStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "roommate_card.draft.created",
      entityType: "roommateRequests",
      entityId: requestId,
      reason: "User created a roommate card draft",
      newValue: { source: args.source, workflowStatus: "draft" },
    });
    return requestId;
  },
});

export const updateMine = mutation({
  args: { requestId: v.id("roommateRequests"), ...editableFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const card = await ctx.db.get("roommateRequests", args.requestId);
    if (card === null || card.userId !== profile._id || card.deletedAt !== undefined) {
      throw new Error("Roommate card not found.");
    }
    if (card.workflowStatus === "pending_admin_review") {
      throw new Error("A card under review cannot be edited.");
    }
    const normalized = normalize(args);
    await validateLinkedProperty(ctx, args.linkedPropertyId);
    const now = Date.now();
    await ctx.db.patch(card._id, {
      source: args.source,
      linkedPropertyId: args.linkedPropertyId,
      propertyId: undefined,
      userType: args.userType,
      age: args.age,
      organization: normalized.organization,
      major: normalized.major,
      moveInDate: args.moveInDate,
      bio: normalized.bio,
      availableRooms: args.availableRooms,
      pricePerPerson: args.pricePerPerson,
      preferences: args.preferences,
      region: normalized.region,
      city: normalized.city,
      district: normalized.district,
      landmark: normalized.landmark,
      externalHousing: normalized.externalHousing,
      workflowStatus: "draft",
      publicationStatus: "draft",
      status: "hidden",
      moderationStatus: "pending",
      rejectionReason: undefined,
      submittedAt: undefined,
      reviewedAt: undefined,
      reviewedByUserId: undefined,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "roommate_card.updated",
      entityType: "roommateRequests",
      entityId: card._id,
      reason: "Card owner updated roommate card",
      previousValue: { workflowStatus: card.workflowStatus, source: card.source },
      newValue: { workflowStatus: "draft", source: args.source },
    });
    return null;
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    return await ctx.db
      .query("roommateRequests")
      .withIndex("by_user_status", (q) => q.eq("userId", profile._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listPublished = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("roommateRequests")
      .withIndex("by_status_created", (q) => q.eq("status", "open"))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.filter(
        (item) =>
          item.deletedAt === undefined &&
          item.workflowStatus === "published" &&
          item.publicationStatus === "approved",
      ),
    };
  },
});

export const get = query({
  args: { requestId: v.id("roommateRequests") },
  handler: async (ctx, args) => {
    const card = await ctx.db.get("roommateRequests", args.requestId);
    if (
      card === null ||
      card.deletedAt !== undefined ||
      card.status !== "open" ||
      card.workflowStatus !== "published" ||
      card.publicationStatus !== "approved"
    ) {
      return null;
    }
    const profile = await ctx.db.get("userProfiles", card.userId);
    const property =
      card.linkedPropertyId === undefined
        ? null
        : await ctx.db.get("properties", card.linkedPropertyId);
    return {
      card,
      owner:
        profile && profile.status === "active" ? { name: profile.name, city: profile.city } : null,
      linkedProperty:
        property &&
        property.deletedAt === undefined &&
        property.status === "published" &&
        property.publicationStatus === "approved"
          ? property
          : null,
    };
  },
});

export const registerInterest = mutation({
  args: { requestId: v.id("roommateRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const card = await ctx.db.get("roommateRequests", args.requestId);
    if (
      card === null ||
      card.deletedAt !== undefined ||
      card.userId === profile._id ||
      card.status !== "open" ||
      card.workflowStatus !== "published" ||
      card.publicationStatus !== "approved"
    ) {
      throw new Error("Roommate card is unavailable.");
    }
    const existing = await ctx.db
      .query("roommateInterests")
      .withIndex("by_requester_and_request", (q) =>
        q.eq("requesterUserId", profile._id).eq("roommateRequestId", card._id),
      )
      .unique();
    const now = Date.now();
    if (existing?.status === "registered") return null;
    if (existing === null) {
      await ctx.db.insert("roommateInterests", {
        requesterUserId: profile._id,
        roommateRequestId: card._id,
        status: "registered",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, { status: "registered", updatedAt: now });
    }
    await enqueueBusinessNotification(ctx, {
      userId: card.userId,
      idempotencyKey: `roommate-interest:${card._id}:${profile._id}:registered`,
      type: "roommate.interest_registered",
      title: "اهتمام جديد ببطاقة شريكة السكن",
      body: "سجلت باحثة عن سكن اهتمامها ببطاقتك، ويمكنك التواصل معها عبر القناة المعتمدة.",
      deepLink: "/user/dashboard",
      relatedPropertyId: card.linkedPropertyId,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "roommate.interest_registered",
      entityType: "roommateRequests",
      entityId: card._id,
      reason: "User registered interest in roommate card",
      newValue: { status: "registered" },
    });
    return null;
  },
});

export const listMyInterests = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireActiveProfile(ctx);
    return await ctx.db
      .query("roommateInterests")
      .withIndex("by_requester_and_status", (q) =>
        q.eq("requesterUserId", profile._id).eq("status", "registered"),
      )
      .order("desc")
      .take(100);
  },
});

export const withdrawInterest = mutation({
  args: { requestId: v.id("roommateRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const existing = await ctx.db
      .query("roommateInterests")
      .withIndex("by_requester_and_request", (q) =>
        q.eq("requesterUserId", profile._id).eq("roommateRequestId", args.requestId),
      )
      .unique();
    if (existing?.status === "registered") {
      await ctx.db.patch(existing._id, { status: "withdrawn", updatedAt: Date.now() });
    }
    return null;
  },
});

export const closeMine = mutation({
  args: { requestId: v.id("roommateRequests"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const card = await ctx.db.get("roommateRequests", args.requestId);
    if (card === null || card.userId !== profile._id || card.deletedAt !== undefined) {
      throw new Error("Roommate card not found.");
    }
    const reason = args.reason.trim().slice(0, 500);
    if (!reason) throw new Error("A close reason is required.");
    const now = Date.now();
    await ctx.db.patch(card._id, {
      status: "closed",
      workflowStatus: "hidden",
      publicationStatus: "unpublished",
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "roommate_card.closed",
      entityType: "roommateRequests",
      entityId: card._id,
      reason,
      previousValue: { status: card.status, workflowStatus: card.workflowStatus },
      newValue: { status: "closed", workflowStatus: "hidden" },
    });
    return null;
  },
});
