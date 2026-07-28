import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { Id } from "../_generated/dataModel";

export async function authenticatedIdentityKey(
  ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
  const runtimeIdentity = await ctx.auth.getUserIdentity();
  if (runtimeIdentity === null) return null;
  const identityKey = (runtimeIdentity as unknown as Record<string, unknown>).identityKey;
  if (typeof identityKey === "string" && identityKey.trim()) return identityKey.trim();
  return runtimeIdentity.tokenIdentifier?.trim() || null;
}

export async function requireActiveProfile(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"userProfiles">> {
  const identityKey = await authenticatedIdentityKey(ctx);
  if (identityKey === null) throw new Error("Authentication required.");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_identity_key", (q) => q.eq("identityKey", identityKey))
    .unique();
  if (profile === null || profile.status !== "active") {
    throw new Error("An active user profile is required.");
  }
  return profile;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"userProfiles">> {
  const profile = await requireActiveProfile(ctx);
  if (profile.primaryRole === "admin") return profile;
  const assignment = await ctx.db
    .query("roleAssignments")
    .withIndex("by_user_role", (q) => q.eq("userId", profile._id).eq("role", "admin"))
    .unique();
  if (assignment === null || assignment.status !== "active" || assignment.scope !== "global") {
    throw new Error("Administrator access required.");
  }
  return profile;
}

export async function hasActiveGlobalRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"userProfiles">,
  role: "admin" | "moderator" | "support",
): Promise<boolean> {
  const profile = await ctx.db.get("userProfiles", userId);
  if (profile === null || profile.status !== "active") return false;
  if (profile.primaryRole === role) return true;
  const assignment = await ctx.db
    .query("roleAssignments")
    .withIndex("by_user_role", (q) => q.eq("userId", userId).eq("role", role))
    .unique();
  return assignment?.status === "active" && assignment.scope === "global";
}
