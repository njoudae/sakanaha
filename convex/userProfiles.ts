import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

function displayNameFromAuthUser(user: { name?: string; email?: string; phone?: string }): string {
  return user.name ?? user.email ?? user.phone ?? "Saknaha user";
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) return null;

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .first();
  },
});

export const ensureCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) {
      throw new Error("Authentication required.");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .first();
    if (existing !== null) return existing._id;

    const authUser = await ctx.db.get(authUserId);
    if (authUser === null) {
      throw new Error("Authenticated user not found.");
    }

    const now = Date.now();
    if (authUser.email && authUser.emailVerificationTime !== undefined) {
      const profileByEmail = await ctx.db
        .query("userProfiles")
        .withIndex("by_email", (q) => q.eq("email", authUser.email))
        .first();
      if (profileByEmail !== null) {
        await ctx.db.patch(profileByEmail._id, {
          authUserId,
          authSubject: `convex:${authUserId}`,
          updatedAt: now,
        });
        return profileByEmail._id;
      }
    }

    if (authUser.phone && authUser.phoneVerificationTime !== undefined) {
      const profileByPhone = await ctx.db
        .query("userProfiles")
        .withIndex("by_phone", (q) => q.eq("phone", authUser.phone))
        .first();
      if (profileByPhone !== null) {
        await ctx.db.patch(profileByPhone._id, {
          authUserId,
          authSubject: `convex:${authUserId}`,
          updatedAt: now,
        });
        return profileByPhone._id;
      }
    }

    return await ctx.db.insert("userProfiles", {
      authUserId,
      authSubject: `convex:${authUserId}`,
      name: displayNameFromAuthUser(authUser),
      email: authUser.email,
      phone: authUser.phone,
      primaryRole: "user",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});
