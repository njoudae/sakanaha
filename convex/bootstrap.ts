import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const INITIAL_ADMIN_BOOTSTRAP_KEY = "initial-platform-admin-v1";

export const initialAdmin = internalMutation({
  args: { identityKey: v.string() },
  returns: v.object({
    profileId: v.id("userProfiles"),
    identityKey: v.string(),
    alreadyCompleted: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const completed = await ctx.db
      .query("bootstrapRuns")
      .withIndex("by_key", (q) => q.eq("key", INITIAL_ADMIN_BOOTSTRAP_KEY))
      .unique();
    if (completed !== null) {
      const profile = await ctx.db.get("userProfiles", completed.completedByUserId);
      if (profile?.identityKey === undefined) throw new Error("Bootstrap record is invalid.");
      return {
        profileId: profile._id,
        identityKey: profile.identityKey,
        alreadyCompleted: true,
      };
    }

    const identityKey = args.identityKey.trim();
    if (!identityKey) throw new Error("A canonical authenticated identity key is required.");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_identity_key", (q) => q.eq("identityKey", identityKey))
      .unique();
    if (profile === null) {
      throw new Error("No existing platform profile is linked to this authenticated identity.");
    }
    const now = Date.now();
    const existingAssignment = await ctx.db
      .query("roleAssignments")
      .withIndex("by_user_role", (q) => q.eq("userId", profile._id).eq("role", "admin"))
      .unique();
    if (existingAssignment === null) {
      await ctx.db.insert("roleAssignments", {
        userId: profile._id,
        role: "admin",
        scope: "global",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingAssignment._id, {
        scope: "global",
        status: "active",
        updatedAt: now,
      });
    }
    await ctx.db.patch(profile._id, {
      primaryRole: "admin",
      updatedAt: now,
    });
    await ctx.db.insert("bootstrapRuns", {
      key: INITIAL_ADMIN_BOOTSTRAP_KEY,
      completedByUserId: profile._id,
      completedAt: now,
      metadata: { identityKey: profile.identityKey },
    });
    await ctx.db.insert("auditEvents", {
      actorUserId: profile._id,
      adminId: profile._id,
      actorType: "system",
      action: "system.initial_admin_bootstrapped",
      entity: `userProfiles:${profile._id}`,
      targetTable: "userProfiles",
      targetId: profile._id,
      entityType: "user",
      entityId: profile._id,
      timestamp: now,
      previousValue: { primaryRole: profile.primaryRole },
      newValue: { primaryRole: "admin" },
      createdAt: now,
    });
    return { profileId: profile._id, identityKey, alreadyCompleted: false };
  },
});
