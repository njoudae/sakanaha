import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireActiveProfile } from "./lib/authorization";

type DatabaseCtx = QueryCtx | MutationCtx;

export const MAX_PROPERTY_IMAGES = 30;
export const MAX_PROPERTY_VIDEOS = 10;
export const MAX_UPLOAD_RETRIES = 3;
export const UPLOAD_TTL_MS = 30 * 60 * 1000;

export { requireActiveProfile };

export async function canManageProperty(
  ctx: DatabaseCtx,
  userId: Id<"userProfiles">,
  propertyId: Id<"properties">,
) {
  const profile = await ctx.db.get("userProfiles", userId);
  if (profile?.primaryRole === "admin" || profile?.primaryRole === "moderator") return true;

  const property = await ctx.db.get("properties", propertyId);
  if (property === null || property.deletedAt !== undefined) return false;
  const owner = await ctx.db.get("ownerProfiles", property.ownerProfileId);
  return owner?.userId === userId && owner.status === "active";
}

export async function requireMediaManager(ctx: DatabaseCtx, mediaId: Id<"propertyMedia">) {
  const profile = await requireActiveProfile(ctx);
  const media = await ctx.db.get("propertyMedia", mediaId);
  if (media === null || media.deletedAt !== undefined) throw new Error("Media not found.");
  if (media.uploaderUserId === profile._id) return { media, profile };
  if (media.propertyId && (await canManageProperty(ctx, profile._id, media.propertyId))) {
    return { media, profile };
  }
  if (profile.primaryRole === "admin" || profile.primaryRole === "moderator") {
    return { media, profile };
  }
  throw new Error("You do not have permission to manage this media.");
}
