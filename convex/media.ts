import {
  createProviderConfiguration,
  hasExpectedImageSignature,
  hasExpectedVideoSignature,
  validateImageUpload,
  validateVideoUpload,
} from "@saknaha/providers";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";
import {
  MAX_PROPERTY_IMAGES,
  MAX_PROPERTY_VIDEOS,
  MAX_UPLOAD_RETRIES,
  UPLOAD_TTL_MS,
  canManageProperty,
  requireActiveProfile,
  requireMediaManager,
} from "./mediaSupport";
import { authenticatedIdentityKey } from "./lib/authorization";

const THUMBNAIL_MAX_BYTES = 512 * 1024;

function storageConfig() {
  const config = createProviderConfiguration(process.env).storage;
  if (config.status !== "enabled" || config.provider !== "convex") {
    throw new Error("Convex media storage is not enabled.");
  }
  return config;
}

async function createTargets(ctx: { storage: { generateUploadUrl(): Promise<string> } }) {
  const [uploadUrl, thumbnailUploadUrl] = await Promise.all([
    ctx.storage.generateUploadUrl(),
    ctx.storage.generateUploadUrl(),
  ]);
  return { uploadUrl, thumbnailUploadUrl };
}

export const createUpload = mutation({
  args: {
    propertyId: v.optional(v.id("properties")),
    fileName: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    checksum: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const config = storageConfig();
    validateImageUpload(args, config);
    if (args.propertyId && !(await canManageProperty(ctx, profile._id, args.propertyId))) {
      throw new Error("You do not have permission to upload media for this property.");
    }

    const existing = args.propertyId
      ? await ctx.db
          .query("propertyMedia")
          .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
          .take(MAX_PROPERTY_IMAGES + MAX_PROPERTY_VIDEOS)
      : [];
    const active = existing.filter(
      (media) =>
        media.kind === "image" && media.deletedAt === undefined && media.status !== "deleted",
    );
    if (active.length >= MAX_PROPERTY_IMAGES) {
      throw new Error(`A property can contain at most ${MAX_PROPERTY_IMAGES} images.`);
    }

    const now = Date.now();
    const mediaId = await ctx.db.insert("propertyMedia", {
      propertyId: args.propertyId,
      uploaderUserId: profile._id,
      provider: "convex",
      kind: "image",
      originalFileName: args.fileName.trim(),
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      checksum: args.checksum,
      width: args.width,
      height: args.height,
      isCover: args.propertyId !== undefined && active.length === 0,
      status: "pending_upload",
      scanStatus: "pending",
      uploadExpiresAt: now + UPLOAD_TTL_MS,
      retryCount: 0,
      sortOrder: active.length,
      createdAt: now,
      updatedAt: now,
    });
    return { mediaId, expiresAt: now + UPLOAD_TTL_MS, ...(await createTargets(ctx)) };
  },
});

export const createVideoUpload = mutation({
  args: {
    propertyId: v.optional(v.id("properties")),
    fileName: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    checksum: v.optional(v.string()),
  },
  returns: v.object({
    mediaId: v.id("propertyMedia"),
    uploadUrl: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const config = storageConfig();
    validateVideoUpload(args, config.maxUploadBytes);
    if (args.propertyId && !(await canManageProperty(ctx, profile._id, args.propertyId))) {
      throw new Error("You do not have permission to upload media for this property.");
    }
    const existing = args.propertyId
      ? await ctx.db
          .query("propertyMedia")
          .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
          .take(MAX_PROPERTY_IMAGES + MAX_PROPERTY_VIDEOS)
      : [];
    const activeVideos = existing.filter(
      (media) =>
        media.kind === "video" && media.deletedAt === undefined && media.status !== "deleted",
    );
    if (activeVideos.length >= MAX_PROPERTY_VIDEOS) {
      throw new Error(`A property can contain at most ${MAX_PROPERTY_VIDEOS} videos.`);
    }
    const now = Date.now();
    const mediaId = await ctx.db.insert("propertyMedia", {
      propertyId: args.propertyId,
      uploaderUserId: profile._id,
      provider: "convex",
      kind: "video",
      originalFileName: args.fileName.trim(),
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      checksum: args.checksum,
      status: "pending_upload",
      scanStatus: "pending",
      uploadExpiresAt: now + UPLOAD_TTL_MS,
      retryCount: 0,
      sortOrder: activeVideos.length,
      createdAt: now,
      updatedAt: now,
    });
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { mediaId, uploadUrl, expiresAt: now + UPLOAD_TTL_MS };
  },
});

export const registerUploadedVideo = mutation({
  args: {
    mediaId: v.id("propertyMedia"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    if (
      media.kind !== "video" ||
      media.status !== "pending_upload" ||
      (media.uploadExpiresAt ?? 0) < Date.now()
    ) {
      throw new Error("The video upload reservation has expired.");
    }
    const object = await ctx.db.system.get("_storage", args.storageId);
    if (!object || object.contentType !== media.mimeType || object.size !== media.byteSize) {
      throw new Error("The uploaded video does not match its reservation.");
    }
    await ctx.db.patch("propertyMedia", media._id, {
      storageId: args.storageId,
      status: "processing",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const finalizeVideoUpload = action({
  args: { mediaId: v.id("propertyMedia") },
  returns: v.object({
    mediaId: v.id("propertyMedia"),
    url: v.string(),
  }),
  handler: async (ctx, args): Promise<{ mediaId: Id<"propertyMedia">; url: string }> => {
    const media: Doc<"propertyMedia"> = await ctx.runQuery(
      internal.mediaState.getVideoFinalizeContext,
      { mediaId: args.mediaId },
    );
    if (media.kind !== "video" || !media.storageId) throw new Error("Video upload is incomplete.");
    const blob = await ctx.storage.get(media.storageId);
    try {
      if (!blob) throw new Error("Uploaded video is missing.");
      const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
      if (!hasExpectedVideoSignature(bytes, media.mimeType ?? "")) {
        throw new Error("The uploaded video signature is invalid.");
      }
      await ctx.runMutation(internal.mediaState.approve, {
        mediaId: media._id,
        width: 0,
        height: 0,
      });
      const url = await ctx.storage.getUrl(media.storageId);
      if (!url) throw new Error("A secure video URL could not be created.");
      return { mediaId: media._id, url };
    } catch (error) {
      if (media.storageId) await ctx.storage.delete(media.storageId);
      const reason = error instanceof Error ? error.message : "Video processing failed.";
      await ctx.runMutation(internal.mediaState.reject, { mediaId: media._id, reason });
      throw new Error(reason, { cause: error });
    }
  },
});

export const registerUploadedImage = mutation({
  args: {
    mediaId: v.id("propertyMedia"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    if (media.status !== "pending_upload" || (media.uploadExpiresAt ?? 0) < Date.now()) {
      throw new Error("The upload reservation has expired.");
    }
    const object = await ctx.db.system.get("_storage", args.storageId);
    if (!object) throw new Error("The uploaded image is missing.");
    if (object.contentType !== media.mimeType || object.size !== media.byteSize) {
      throw new Error("The uploaded image does not match its reservation.");
    }
    await ctx.db.patch("propertyMedia", media._id, {
      storageId: args.storageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const registerUploadedThumbnail = mutation({
  args: {
    mediaId: v.id("propertyMedia"),
    thumbnailStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    if (
      media.status !== "pending_upload" ||
      !media.storageId ||
      (media.uploadExpiresAt ?? 0) < Date.now()
    ) {
      throw new Error("The image upload is not ready for a thumbnail.");
    }
    const thumbnail = await ctx.db.system.get("_storage", args.thumbnailStorageId);
    if (!thumbnail) throw new Error("The uploaded thumbnail is missing.");
    if (thumbnail.contentType !== "image/webp" || thumbnail.size > THUMBNAIL_MAX_BYTES) {
      throw new Error("The generated thumbnail is invalid.");
    }
    await ctx.db.patch("propertyMedia", media._id, {
      thumbnailStorageId: args.thumbnailStorageId,
      thumbnailMimeType: thumbnail.contentType,
      thumbnailByteSize: thumbnail.size,
      status: "processing",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const finalizeUpload = action({
  args: { mediaId: v.id("propertyMedia"), width: v.number(), height: v.number() },
  handler: async (
    ctx,
    args,
  ): Promise<{ mediaId: Id<"propertyMedia">; url: string; thumbnailUrl: string }> => {
    if (
      !Number.isFinite(args.width) ||
      !Number.isFinite(args.height) ||
      args.width < 1 ||
      args.height < 1
    ) {
      throw new Error("The image dimensions are invalid.");
    }
    const media: Doc<"propertyMedia"> = await ctx.runQuery(internal.mediaState.getFinalizeContext, {
      mediaId: args.mediaId,
    });
    const [blob, thumbnailBlob] = await Promise.all([
      ctx.storage.get(media.storageId!),
      ctx.storage.get(media.thumbnailStorageId!),
    ]);
    try {
      if (!blob || !thumbnailBlob) throw new Error("Uploaded media is missing.");
      const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
      const thumbnailBytes = new Uint8Array(await thumbnailBlob.slice(0, 16).arrayBuffer());
      if (!hasExpectedImageSignature(bytes, media.mimeType ?? "")) {
        throw new Error("The uploaded file signature is invalid.");
      }
      if (!hasExpectedImageSignature(thumbnailBytes, "image/webp")) {
        throw new Error("The thumbnail signature is invalid.");
      }
      await ctx.runMutation(internal.mediaState.approve, {
        mediaId: media._id,
        width: args.width,
        height: args.height,
      });
      const [url, thumbnailUrl] = await Promise.all([
        ctx.storage.getUrl(media.storageId!),
        ctx.storage.getUrl(media.thumbnailStorageId!),
      ]);
      if (!url || !thumbnailUrl) throw new Error("Secure media URLs could not be created.");
      return { mediaId: media._id, url, thumbnailUrl };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Media processing failed.";
      await Promise.allSettled([
        media.storageId ? ctx.storage.delete(media.storageId) : Promise.resolve(),
        media.thumbnailStorageId ? ctx.storage.delete(media.thumbnailStorageId) : Promise.resolve(),
      ]);
      await ctx.runMutation(internal.mediaState.reject, { mediaId: media._id, reason });
      throw new Error(reason, { cause: error });
    }
  },
});

export const retryUpload = mutation({
  args: { mediaId: v.id("propertyMedia") },
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    const retryCount = media.retryCount ?? 0;
    if (retryCount >= MAX_UPLOAD_RETRIES) throw new Error("The upload retry limit was reached.");
    if (media.storageId) await ctx.storage.delete(media.storageId);
    if (media.thumbnailStorageId) await ctx.storage.delete(media.thumbnailStorageId);
    const expiresAt = Date.now() + UPLOAD_TTL_MS;
    await ctx.db.patch("propertyMedia", media._id, {
      storageId: undefined,
      thumbnailStorageId: undefined,
      thumbnailMimeType: undefined,
      thumbnailByteSize: undefined,
      status: "pending_upload",
      scanStatus: "pending",
      uploadExpiresAt: expiresAt,
      retryCount: retryCount + 1,
      lastError: undefined,
      updatedAt: Date.now(),
    });
    return { mediaId: media._id, expiresAt, ...(await createTargets(ctx)) };
  },
});

export const attachToProperty = mutation({
  args: { mediaId: v.id("propertyMedia"), propertyId: v.id("properties"), makeCover: v.boolean() },
  handler: async (ctx, args) => {
    const { media, profile } = await requireMediaManager(ctx, args.mediaId);
    if (media.status !== "approved") throw new Error("Only approved media can be attached.");
    if (!(await canManageProperty(ctx, profile._id, args.propertyId))) {
      throw new Error("You do not have permission to change this property.");
    }
    const existing = await ctx.db
      .query("propertyMedia")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .take(MAX_PROPERTY_IMAGES + MAX_PROPERTY_VIDEOS);
    const activeOfKind = existing.filter(
      (item) =>
        item.kind === media.kind && item.status !== "deleted" && item.deletedAt === undefined,
    );
    const maximum = media.kind === "video" ? MAX_PROPERTY_VIDEOS : MAX_PROPERTY_IMAGES;
    if (activeOfKind.length >= maximum) {
      throw new Error(`A property can contain at most ${maximum} ${media.kind}s.`);
    }
    const images = existing.filter(
      (item) => item.kind === "image" && item.status !== "deleted" && item.deletedAt === undefined,
    );
    const makeCover =
      media.kind === "image" && (args.makeCover || images.every((item) => item.isCover !== true));
    if (makeCover) {
      for (const item of images) {
        if (item.isCover)
          await ctx.db.patch("propertyMedia", item._id, { isCover: false, updatedAt: Date.now() });
      }
    }
    await ctx.db.patch("propertyMedia", media._id, {
      propertyId: args.propertyId,
      isCover: makeCover,
      sortOrder: activeOfKind.length,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setCover = mutation({
  args: { mediaId: v.id("propertyMedia") },
  handler: async (ctx, args) => {
    const { media, profile } = await requireMediaManager(ctx, args.mediaId);
    if (media.kind !== "image") throw new Error("Only an image can be used as the cover.");
    if (!media.propertyId || !(await canManageProperty(ctx, profile._id, media.propertyId))) {
      throw new Error("You do not have permission to change this property.");
    }
    const items = await ctx.db
      .query("propertyMedia")
      .withIndex("by_property", (q) => q.eq("propertyId", media.propertyId))
      .take(MAX_PROPERTY_IMAGES + MAX_PROPERTY_VIDEOS);
    const now = Date.now();
    for (const item of items.filter((item) => item.kind === "image")) {
      if (item.isCover !== (item._id === media._id)) {
        await ctx.db.patch("propertyMedia", item._id, {
          isCover: item._id === media._id,
          updatedAt: now,
        });
      }
    }
    return null;
  },
});

export const remove = mutation({
  args: { mediaId: v.id("propertyMedia") },
  handler: async (ctx, args) => {
    const { media } = await requireMediaManager(ctx, args.mediaId);
    if (media.storageId) await ctx.storage.delete(media.storageId);
    if (media.thumbnailStorageId) await ctx.storage.delete(media.thumbnailStorageId);
    const now = Date.now();
    await ctx.db.patch("propertyMedia", media._id, {
      storageId: undefined,
      thumbnailStorageId: undefined,
      status: "deleted",
      deletedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const listForProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const property = await ctx.db.get("properties", args.propertyId);
    if (!property || property.deletedAt !== undefined) return [];
    let authorized = property.status === "published";
    const identityKey = await authenticatedIdentityKey(ctx);
    if (!authorized && identityKey) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_identity_key", (q) => q.eq("identityKey", identityKey))
        .unique();
      authorized = profile !== null && (await canManageProperty(ctx, profile._id, property._id));
    }
    if (!authorized) throw new Error("You do not have permission to view this media.");
    const items = await ctx.db
      .query("propertyMedia")
      .withIndex("by_property", (q) => q.eq("propertyId", property._id))
      .take(MAX_PROPERTY_IMAGES + MAX_PROPERTY_VIDEOS);
    const visible = items.filter(
      (item) => item.status === "approved" && item.deletedAt === undefined,
    );
    return await Promise.all(
      visible
        .sort(
          (a, b) =>
            Number(b.isCover === true) - Number(a.isCover === true) || a.sortOrder - b.sortOrder,
        )
        .map(async (item) => ({
          id: item._id,
          kind: item.kind,
          url: item.storageId ? await ctx.storage.getUrl(item.storageId) : (item.legacyUrl ?? null),
          thumbnailUrl: item.thumbnailStorageId
            ? await ctx.storage.getUrl(item.thumbnailStorageId)
            : null,
          isCover: item.isCover === true,
          width: item.width,
          height: item.height,
          mimeType: item.mimeType,
        })),
    );
  },
});
