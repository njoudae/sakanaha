import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authenticatedIdentityKey, requireActiveProfile } from "./lib/authorization";
import { recordBusinessAudit } from "./lib/businessEvents";
import { locationQuality } from "./validators";

const propertyFeature = v.union(
  v.literal("cleaning_worker"),
  v.literal("security_cameras"),
  v.literal("elevator"),
  v.literal("self_check_in"),
);
const propertyFacility = v.union(
  v.literal("mosque"),
  v.literal("grocery"),
  v.literal("supermarket"),
  v.literal("malls"),
  v.literal("food_supply"),
  v.literal("mall"),
  v.literal("salon"),
  v.literal("bus_station"),
  v.literal("train_station"),
  v.literal("pharmacy"),
  v.literal("clinics"),
);
const rentUtility = v.union(v.literal("electricity"), v.literal("water"), v.literal("internet"));
const rentalPrices = v.object({
  daily: v.optional(v.number()),
  weekly: v.optional(v.number()),
  monthly: v.optional(v.number()),
  yearly: v.optional(v.number()),
});
const editableFields = {
  title: v.string(),
  propertyLicenseNumber: v.string(),
  region: v.optional(v.string()),
  city: v.string(),
  neighborhood: v.string(),
  district: v.optional(v.string()),
  landmark: v.optional(v.string()),
  address: v.string(),
  universityNearby: v.string(),
  googleMapsUrl: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  locationVisibility: v.optional(
    v.union(v.literal("exact"), v.literal("approximate"), v.literal("private")),
  ),
  locationQuality,
  classification: v.string(),
  propertyType: v.string(),
  minRooms: v.number(),
  maxRooms: v.number(),
  floorsCount: v.number(),
  bathrooms: v.number(),
  furnished: v.boolean(),
  maxResidents: v.number(),
  totalUnits: v.number(),
  availableUnits: v.number(),
  roommateAllowed: v.boolean(),
  requiresLeaseContract: v.boolean(),
  features: v.array(propertyFeature),
  facilities: v.array(propertyFacility),
  rentIncludes: v.array(rentUtility),
  hasTransportService: v.boolean(),
  universityBusPasses: v.boolean(),
  rentalPrices,
  displayPricePeriod: v.union(
    v.literal("daily"),
    v.literal("weekly"),
    v.literal("monthly"),
    v.literal("yearly"),
  ),
  negotiable: v.boolean(),
  allowWhatsappContact: v.boolean(),
  deposit: v.optional(v.number()),
  priceNotes: v.optional(v.string()),
};

function normalizedText(value: string, label: string, max = 200) {
  const normalized = value.trim().slice(0, max);
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function validateNumbers(args: {
  minRooms: number;
  maxRooms: number;
  floorsCount: number;
  bathrooms: number;
  maxResidents: number;
  totalUnits: number;
  availableUnits: number;
  rentalPrices: { daily?: number; weekly?: number; monthly?: number; yearly?: number };
  displayPricePeriod: "daily" | "weekly" | "monthly" | "yearly";
}) {
  const integers = [
    args.minRooms,
    args.maxRooms,
    args.floorsCount,
    args.bathrooms,
    args.maxResidents,
    args.totalUnits,
    args.availableUnits,
  ];
  if (integers.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Property counts must be non-negative integers.");
  }
  if (
    args.minRooms < 1 ||
    args.maxRooms < args.minRooms ||
    args.totalUnits < 1 ||
    args.availableUnits > args.totalUnits
  ) {
    throw new Error("Property inventory or room range is invalid.");
  }
  const price = args.rentalPrices[args.displayPricePeriod];
  if (price === undefined || !Number.isFinite(price) || price <= 0) {
    throw new Error("A valid main display price is required.");
  }
  for (const value of Object.values(args.rentalPrices)) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new Error("Rental prices must be positive.");
    }
  }
  return price;
}

async function activeAgent(ctx: Parameters<typeof requireActiveProfile>[0]) {
  const profile = await requireActiveProfile(ctx);
  const owner = await ctx.db
    .query("ownerProfiles")
    .withIndex("by_user", (q) => q.eq("userId", profile._id))
    .unique();
  if (owner === null || owner.status !== "active" || owner.verificationStatus !== "verified") {
    throw new Error("A verified active agent profile is required.");
  }
  return { profile, owner };
}

function propertyPatch(args: {
  title: string;
  propertyLicenseNumber: string;
  region?: string;
  city: string;
  neighborhood: string;
  district?: string;
  landmark?: string;
  address: string;
  universityNearby: string;
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
  locationVisibility?: "exact" | "approximate" | "private";
  locationQuality: "verified" | "manual" | "geocoded" | "approximate";
  classification: string;
  propertyType: string;
  minRooms: number;
  maxRooms: number;
  floorsCount: number;
  bathrooms: number;
  furnished: boolean;
  maxResidents: number;
  totalUnits: number;
  availableUnits: number;
  roommateAllowed: boolean;
  requiresLeaseContract: boolean;
  features: Array<"cleaning_worker" | "security_cameras" | "elevator" | "self_check_in">;
  facilities: Array<
    | "mosque"
    | "grocery"
    | "supermarket"
    | "malls"
    | "food_supply"
    | "mall"
    | "salon"
    | "bus_station"
    | "train_station"
    | "pharmacy"
    | "clinics"
  >;
  rentIncludes: Array<"electricity" | "water" | "internet">;
  hasTransportService: boolean;
  universityBusPasses: boolean;
  rentalPrices: { daily?: number; weekly?: number; monthly?: number; yearly?: number };
  displayPricePeriod: "daily" | "weekly" | "monthly" | "yearly";
  negotiable: boolean;
  allowWhatsappContact: boolean;
  deposit?: number;
  priceNotes?: string;
}) {
  const price = validateNumbers(args);
  const title = normalizedText(args.title, "Title", 160);
  const city = normalizedText(args.city, "City", 100);
  const neighborhood = normalizedText(args.neighborhood, "Neighborhood", 120);
  return {
    title,
    propertyLicenseNumber: normalizedText(
      args.propertyLicenseNumber,
      "Property license number",
      100,
    ),
    region: args.region?.trim().slice(0, 100) || undefined,
    city,
    neighborhood,
    district: args.district?.trim().slice(0, 120) || neighborhood,
    landmark: args.landmark?.trim().slice(0, 160) || undefined,
    address: normalizedText(args.address, "Address", 300),
    universityNearby: normalizedText(args.universityNearby, "Nearby university", 160),
    googleMapsUrl: args.googleMapsUrl?.trim().slice(0, 500) || undefined,
    lat: args.lat,
    lng: args.lng,
    locationVisibility: args.locationVisibility,
    locationQuality: args.locationQuality,
    classification: normalizedText(args.classification, "Classification", 100),
    propertyType: normalizedText(args.propertyType, "Property type", 100),
    minRooms: args.minRooms,
    maxRooms: args.maxRooms,
    floorsCount: args.floorsCount,
    bathrooms: args.bathrooms,
    furnished: args.furnished,
    maxResidents: args.maxResidents,
    totalUnits: args.totalUnits,
    availableUnits: args.availableUnits,
    availabilityStatus:
      args.availableUnits === 0
        ? ("full" as const)
        : args.availableUnits <= 2
          ? ("nearly_full" as const)
          : ("available" as const),
    roommateAllowed: args.roommateAllowed,
    requiresLeaseContract: args.requiresLeaseContract,
    features: [...new Set(args.features)],
    facilities: [...new Set(args.facilities)],
    rentIncludes: [...new Set(args.rentIncludes)],
    hasElevator: args.features.includes("elevator"),
    hasCleaningWorker: args.features.includes("cleaning_worker"),
    hasTransportService: args.hasTransportService,
    universityBusPasses: args.universityBusPasses,
    rentalPrices: args.rentalPrices,
    price,
    paymentType: args.displayPricePeriod,
    negotiable: args.negotiable,
    allowWhatsappContact: args.allowWhatsappContact,
    deposit: args.deposit,
    priceNotes: args.priceNotes?.trim().slice(0, 500) || undefined,
    searchText: `${title} ${city} ${neighborhood}`.slice(0, 500),
  };
}

export const createDraft = mutation({
  args: editableFields,
  returns: v.id("properties"),
  handler: async (ctx, args) => {
    const { profile, owner } = await activeAgent(ctx);
    const patch = propertyPatch(args);
    const now = Date.now();
    const propertyId = await ctx.db.insert("properties", {
      ownerProfileId: owner._id,
      ...patch,
      status: "draft",
      publicationStatus: "draft",
      moderationStatus: "pending",
      workflowStatus: "draft",
      paymentStatus: "unpaid",
      contentVersion: 1,
      createdAt: now,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "property.draft.created",
      entityType: "properties",
      entityId: propertyId,
      reason: "Agent created a property draft",
      newValue: { workflowStatus: "draft", contentVersion: 1 },
    });
    return propertyId;
  },
});

export const updateMine = mutation({
  args: { propertyId: v.id("properties"), ...editableFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, owner } = await activeAgent(ctx);
    const property = await ctx.db.get("properties", args.propertyId);
    if (property === null || property.ownerProfileId !== owner._id || property.deletedAt) {
      throw new Error("Property not found.");
    }
    if (property.workflowStatus === "pending_admin_review") {
      throw new Error("A property under review cannot be edited.");
    }
    const patch = propertyPatch(args);
    const now = Date.now();
    const contentVersion = (property.contentVersion ?? 1) + 1;
    await ctx.db.patch(property._id, {
      ...patch,
      workflowStatus: "draft",
      status: "draft",
      publicationStatus: "draft",
      moderationStatus: "pending",
      rejectionReason: undefined,
      submittedAt: undefined,
      reviewedAt: undefined,
      reviewedByUserId: undefined,
      contentVersion,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "property.draft.updated",
      entityType: "properties",
      entityId: property._id,
      reason: "Property owner updated listing content",
      previousValue: {
        workflowStatus: property.workflowStatus,
        contentVersion: property.contentVersion,
      },
      newValue: { workflowStatus: "draft", contentVersion },
    });
    return null;
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { owner } = await activeAgent(ctx);
    return await ctx.db
      .query("properties")
      .withIndex("by_owner_status", (q) => q.eq("ownerProfileId", owner._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listPublished = query({
  args: { paginationOpts: paginationOptsValidator, city: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const source =
      args.city === undefined
        ? ctx.db.query("properties").withIndex("by_status_city", (q) => q.eq("status", "published"))
        : ctx.db
            .query("properties")
            .withIndex("by_status_city_published", (q) =>
              q.eq("status", "published").eq("city", args.city!),
            );
    const result = await source.order("desc").paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.filter(
        (item) =>
          item.deletedAt === undefined &&
          item.publicationStatus === "approved" &&
          item.workflowStatus === "published",
      ),
    };
  },
});

export const get = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const property = await ctx.db.get("properties", args.propertyId);
    if (property === null || property.deletedAt !== undefined) return null;
    if (
      property.status === "published" &&
      property.publicationStatus === "approved" &&
      property.workflowStatus === "published"
    ) {
      return property;
    }
    const identityKey = await authenticatedIdentityKey(ctx);
    if (identityKey === null) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_identity_key", (q) => q.eq("identityKey", identityKey))
      .unique();
    if (profile === null || profile.status !== "active") return null;
    if (profile.primaryRole === "admin" || profile.primaryRole === "moderator") return property;
    const owner = await ctx.db.get("ownerProfiles", property.ownerProfileId);
    return owner?.userId === profile._id ? property : null;
  },
});

export const archiveMine = mutation({
  args: { propertyId: v.id("properties"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, owner } = await activeAgent(ctx);
    const property = await ctx.db.get("properties", args.propertyId);
    if (property === null || property.ownerProfileId !== owner._id) {
      throw new Error("Property not found.");
    }
    const reason = args.reason.trim().slice(0, 500);
    if (!reason) throw new Error("An archive reason is required.");
    const now = Date.now();
    await ctx.db.patch(property._id, {
      status: "archived",
      workflowStatus: "archived",
      publicationStatus: "archived",
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "property.archived",
      entityType: "properties",
      entityId: property._id,
      reason,
      previousValue: { workflowStatus: property.workflowStatus },
      newValue: { workflowStatus: "archived" },
    });
    return null;
  },
});
