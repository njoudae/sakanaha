import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

function displayNameFromAuthUser(user: { name?: string; email?: string; phone?: string }): string {
  return user.name ?? user.email ?? user.phone ?? "Saknaha user";
}

async function nextPublicCode(ctx: MutationCtx): Promise<string> {
  const counter = await ctx.db
    .query("publicIdCounters")
    .withIndex("by_key", (q) => q.eq("key", "user"))
    .unique();
  const next = (counter?.value ?? 0) + 1;
  if (counter) {
    await ctx.db.patch(counter._id, { value: next, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("publicIdCounters", { key: "user", value: next, updatedAt: Date.now() });
  }
  return `SK-${String(next).padStart(6, "0")}`;
}

export const current = query({
  args: {},
  returns: v.union(v.null(), v.any()),
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
  returns: v.id("userProfiles"),
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) {
      throw new Error("Authentication required.");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .first();
    if (existing !== null) {
      const runtimeIdentity = await ctx.auth.getUserIdentity();
      if (!existing.publicCode) {
        await ctx.db.patch(existing._id, {
          identityKey: runtimeIdentity?.tokenIdentifier,
          publicCode: await nextPublicCode(ctx),
          updatedAt: Date.now(),
        });
      } else if (!existing.identityKey && runtimeIdentity?.tokenIdentifier) {
        await ctx.db.patch(existing._id, {
          identityKey: runtimeIdentity.tokenIdentifier,
          updatedAt: Date.now(),
        });
      }
      return existing._id;
    }

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
          publicCode: profileByEmail.publicCode ?? (await nextPublicCode(ctx)),
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
          publicCode: profileByPhone.publicCode ?? (await nextPublicCode(ctx)),
          updatedAt: now,
        });
        return profileByPhone._id;
      }
    }

    const runtimeIdentity = await ctx.auth.getUserIdentity();
    return await ctx.db.insert("userProfiles", {
      authUserId,
      authSubject: `convex:${authUserId}`,
      identityKey: runtimeIdentity?.tokenIdentifier,
      publicCode: await nextPublicCode(ctx),
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
