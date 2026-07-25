import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { requireMediaManager } from "./mediaSupport";

export const getFinalizeContext = internalQuery({
  args: { mediaId: v.id("propertyMedia") },
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    if (media.status !== "processing" || !media.storageId || !media.thumbnailStorageId) {
      throw new Error("The upload is not ready for processing.");
    }
    return media;
  },
});

export const getVideoFinalizeContext = internalQuery({
  args: { mediaId: v.id("propertyMedia") },
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    if (media.kind !== "video" || media.status !== "processing" || !media.storageId) {
      throw new Error("The video upload is not ready for processing.");
    }
    return media;
  },
});

export const approve = internalMutation({
  args: {
    mediaId: v.id("propertyMedia"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    if (media.status !== "processing") throw new Error("The upload state changed.");
    const now = Date.now();
    await ctx.db.patch("propertyMedia", media._id, {
      status: "approved",
      scanStatus: "clean",
      width: args.width,
      height: args.height,
      uploadExpiresAt: undefined,
      lastError: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("providerUsageEvents", {
      provider: media.provider ?? "convex",
      capability: "storage",
      operation: "media.upload",
      relatedUserId: media.uploaderUserId,
      relatedPropertyId: media.propertyId,
      unitCount: (media.byteSize ?? 0) + (media.thumbnailByteSize ?? 0),
      status: "success",
      metadata: { mediaId: media._id, mimeType: media.mimeType, isCover: media.isCover === true },
      createdAt: now,
    });
    return null;
  },
});

export const reject = internalMutation({
  args: { mediaId: v.id("propertyMedia"), reason: v.string() },
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    await ctx.db.patch("propertyMedia", media._id, {
      status: "rejected",
      scanStatus: "failed",
      lastError: args.reason.slice(0, 300),
      updatedAt: Date.now(),
    });
    return null;
  },
});
