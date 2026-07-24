import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const CLEANUP_BATCH_SIZE = 50;
const REJECTED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const cleanupOrphans = internalMutation({
  args: { cursor: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiredPending = await ctx.db
      .query("propertyMedia")
      .withIndex("by_status_and_upload_expires_at", (q) =>
        q
          .eq("status", "pending_upload")
          .gt("uploadExpiresAt", 0)
          .lt("uploadExpiresAt", args.cursor ?? now),
      )
      .take(CLEANUP_BATCH_SIZE);
    const staleRejected = await ctx.db
      .query("propertyMedia")
      .withIndex("by_status_and_updated_at", (q) =>
        q.eq("status", "rejected").lt("updatedAt", now - REJECTED_RETENTION_MS),
      )
      .take(Math.max(0, CLEANUP_BATCH_SIZE - expiredPending.length));
    const batch = [...expiredPending, ...staleRejected];
    for (const media of batch) {
      if (media.storageId) await ctx.storage.delete(media.storageId);
      if (media.thumbnailStorageId) await ctx.storage.delete(media.thumbnailStorageId);
      await ctx.db.patch("propertyMedia", media._id, {
        storageId: undefined,
        thumbnailStorageId: undefined,
        status: "deleted",
        deletedAt: now,
        lastError: media.lastError ?? "Orphaned media was removed by retention policy.",
        updatedAt: now,
      });
    }
    if (batch.length === CLEANUP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.mediaCleanup.cleanupOrphans, { cursor: now });
    }
    return { deleted: batch.length };
  },
});
