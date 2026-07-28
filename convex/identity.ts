import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const provisionResult = v.object({
  identityId: v.id("identities"),
  userProfileId: v.id("userProfiles"),
  identityKey: v.string(),
  created: v.boolean(),
});

const sessionResult = v.object({
  sessionId: v.id("identitySessions"),
  identityKey: v.string(),
  userProfileId: v.id("userProfiles"),
  expiresAt: v.number(),
  refreshExpiresAt: v.number(),
});

const validationResult = v.object({
  valid: v.boolean(),
  reason: v.union(
    v.literal("valid"),
    v.literal("not_found"),
    v.literal("revoked"),
    v.literal("expired"),
    v.literal("identity_inactive"),
    v.literal("profile_inactive"),
  ),
  identityKey: v.optional(v.string()),
  userProfileId: v.optional(v.id("userProfiles")),
  expiresAt: v.optional(v.number()),
});

function requireOpaqueValue(value: string, label: string, minimumLength = 24): string {
  const normalized = value.trim();
  if (normalized.length < minimumLength || normalized.length > 256 || /\s/.test(normalized)) {
    throw new Error(`${label} must be an opaque normalized value.`);
  }
  return normalized;
}

export const provisionValidatedIdentity = internalMutation({
  args: {
    providerKey: v.string(),
    providerSubjectHash: v.string(),
    identityKey: v.string(),
    displayName: v.string(),
  },
  returns: provisionResult,
  handler: async (ctx, args) => {
    const providerKey = requireOpaqueValue(args.providerKey, "Provider key", 3);
    const providerSubjectHash = requireOpaqueValue(
      args.providerSubjectHash,
      "Provider subject hash",
      32,
    );
    const identityKey = requireOpaqueValue(args.identityKey, "Identity key");
    const displayName = args.displayName.trim();
    if (!displayName) throw new Error("Display name is required.");

    const existingLink = await ctx.db
      .query("identityProviderLinks")
      .withIndex("by_provider_and_subject_hash", (q) =>
        q.eq("providerKey", providerKey).eq("providerSubjectHash", providerSubjectHash),
      )
      .unique();
    if (existingLink !== null) {
      const identity = await ctx.db.get("identities", existingLink.identityId);
      if (identity === null || identity.status !== "active" || existingLink.status !== "active") {
        throw new Error("The validated provider identity is revoked.");
      }
      if (identity.identityKey !== identityKey) {
        throw new Error("The provider identity is already linked to another identity.");
      }
      return {
        identityId: identity._id,
        userProfileId: identity.userProfileId,
        identityKey,
        created: false,
      };
    }

    const existingIdentity = await ctx.db
      .query("identities")
      .withIndex("by_identity_key", (q) => q.eq("identityKey", identityKey))
      .unique();
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_identity_key", (q) => q.eq("identityKey", identityKey))
      .unique();
    const now = Date.now();
    let identityId;
    let userProfileId;

    if (existingIdentity !== null) {
      if (existingIdentity.status !== "active") throw new Error("The identity is revoked.");
      if (existingProfile === null || existingProfile._id !== existingIdentity.userProfileId) {
        throw new Error("Identity/profile mapping is inconsistent.");
      }
      identityId = existingIdentity._id;
      userProfileId = existingIdentity.userProfileId;
    } else {
      if (existingProfile !== null) {
        throw new Error("A profile exists without its canonical identity record.");
      }
      userProfileId = await ctx.db.insert("userProfiles", {
        identityKey,
        name: displayName,
        primaryRole: "user",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      identityId = await ctx.db.insert("identities", {
        identityKey,
        userProfileId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("identityProviderLinks", {
      identityId,
      providerKey,
      providerSubjectHash,
      status: "active",
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { identityId, userProfileId, identityKey, created: existingIdentity === null };
  },
});

export const createSession = internalMutation({
  args: {
    identityKey: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
    refreshExpiresAt: v.number(),
  },
  returns: sessionResult,
  handler: async (ctx, args) => {
    const identityKey = requireOpaqueValue(args.identityKey, "Identity key");
    const tokenHash = requireOpaqueValue(args.tokenHash, "Session token hash", 32);
    const now = Date.now();
    if (args.expiresAt <= now || args.refreshExpiresAt <= args.expiresAt) {
      throw new Error("Session expiration window is invalid.");
    }
    const duplicate = await ctx.db
      .query("identitySessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (duplicate !== null) throw new Error("Session token hash already exists.");
    const identity = await ctx.db
      .query("identities")
      .withIndex("by_identity_key", (q) => q.eq("identityKey", identityKey))
      .unique();
    if (identity === null || identity.status !== "active") {
      throw new Error("Active identity required.");
    }
    const profile = await ctx.db.get("userProfiles", identity.userProfileId);
    if (profile === null || profile.status !== "active") {
      throw new Error("Active user profile required.");
    }
    const sessionId = await ctx.db.insert("identitySessions", {
      identityId: identity._id,
      tokenHash,
      status: "active",
      expiresAt: args.expiresAt,
      refreshExpiresAt: args.refreshExpiresAt,
      createdAt: now,
      updatedAt: now,
    });
    return {
      sessionId,
      identityKey,
      userProfileId: identity.userProfileId,
      expiresAt: args.expiresAt,
      refreshExpiresAt: args.refreshExpiresAt,
    };
  },
});

export const validateSession = internalMutation({
  args: { tokenHash: v.string(), now: v.optional(v.number()) },
  returns: validationResult,
  handler: async (ctx, args) => {
    const tokenHash = requireOpaqueValue(args.tokenHash, "Session token hash", 32);
    const now = args.now ?? Date.now();
    const session = await ctx.db
      .query("identitySessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session === null) return { valid: false, reason: "not_found" as const };
    if (session.status === "revoked") return { valid: false, reason: "revoked" as const };
    if (session.status === "expired" || session.expiresAt <= now) {
      if (session.status !== "expired") {
        await ctx.db.patch(session._id, { status: "expired", updatedAt: now });
      }
      return { valid: false, reason: "expired" as const };
    }
    const identity = await ctx.db.get("identities", session.identityId);
    if (identity === null || identity.status !== "active") {
      return { valid: false, reason: "identity_inactive" as const };
    }
    const profile = await ctx.db.get("userProfiles", identity.userProfileId);
    if (profile === null || profile.status !== "active") {
      return { valid: false, reason: "profile_inactive" as const };
    }
    await ctx.db.patch(session._id, { lastValidatedAt: now, updatedAt: now });
    return {
      valid: true,
      reason: "valid" as const,
      identityKey: identity.identityKey,
      userProfileId: profile._id,
      expiresAt: session.expiresAt,
    };
  },
});

export const refreshSession = internalMutation({
  args: {
    currentTokenHash: v.string(),
    newTokenHash: v.string(),
    expiresAt: v.number(),
    refreshExpiresAt: v.number(),
    now: v.optional(v.number()),
  },
  returns: sessionResult,
  handler: async (ctx, args) => {
    const currentTokenHash = requireOpaqueValue(
      args.currentTokenHash,
      "Current session token hash",
      32,
    );
    const newTokenHash = requireOpaqueValue(args.newTokenHash, "New session token hash", 32);
    const now = args.now ?? Date.now();
    const current = await ctx.db
      .query("identitySessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", currentTokenHash))
      .unique();
    if (
      current === null ||
      current.status !== "active" ||
      current.refreshExpiresAt <= now ||
      args.expiresAt <= now ||
      args.refreshExpiresAt <= args.expiresAt
    ) {
      throw new Error("Session cannot be refreshed.");
    }
    const duplicate = await ctx.db
      .query("identitySessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", newTokenHash))
      .unique();
    if (duplicate !== null) throw new Error("Session token hash already exists.");
    const identity = await ctx.db.get("identities", current.identityId);
    if (identity === null || identity.status !== "active") throw new Error("Identity is inactive.");
    const profile = await ctx.db.get("userProfiles", identity.userProfileId);
    if (profile === null || profile.status !== "active") {
      throw new Error("User profile is inactive.");
    }
    const sessionId = await ctx.db.insert("identitySessions", {
      identityId: identity._id,
      tokenHash: newTokenHash,
      status: "active",
      expiresAt: args.expiresAt,
      refreshExpiresAt: args.refreshExpiresAt,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(current._id, {
      status: "revoked",
      revokedAt: now,
      replacedBySessionId: sessionId,
      updatedAt: now,
    });
    return {
      sessionId,
      identityKey: identity.identityKey,
      userProfileId: identity.userProfileId,
      expiresAt: args.expiresAt,
      refreshExpiresAt: args.refreshExpiresAt,
    };
  },
});

export const revokeSession = internalMutation({
  args: { tokenHash: v.string(), now: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tokenHash = requireOpaqueValue(args.tokenHash, "Session token hash", 32);
    const session = await ctx.db
      .query("identitySessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session === null || session.status === "revoked") return null;
    const now = args.now ?? Date.now();
    await ctx.db.patch(session._id, {
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
    });
    return null;
  },
});
