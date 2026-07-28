/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const providerKey = "provider-adapter";
const providerSubjectHash = "a".repeat(64);
const identityKey = "opaque-platform-identity-0001";
const tokenHash = "b".repeat(64);

async function provision(t: ReturnType<typeof convexTest>) {
  return await t.mutation(internal.identity.provisionValidatedIdentity, {
    providerKey,
    providerSubjectHash,
    identityKey,
    displayName: "Identity test",
  });
}

describe("provider-agnostic identity foundation", () => {
  it("maps one validated provider identity to exactly one canonical profile", async () => {
    const t = convexTest(schema, modules);
    const first = await provision(t);
    const second = await provision(t);
    expect(first.created).toBe(true);
    expect(second).toMatchObject({
      identityId: first.identityId,
      userProfileId: first.userProfileId,
      identityKey,
      created: false,
    });

    const state = await t.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      links: await ctx.db.query("identityProviderLinks").collect(),
      profiles: await ctx.db.query("userProfiles").collect(),
    }));
    expect(state.identities).toHaveLength(1);
    expect(state.links).toHaveLength(1);
    expect(state.profiles).toHaveLength(1);
    expect(state.profiles[0]).toMatchObject({
      identityKey,
      primaryRole: "user",
      status: "active",
    });
    expect(state.profiles[0]?.phone).toBeUndefined();
    expect(state.profiles[0]?.email).toBeUndefined();
  });

  it("rejects duplicate provider ownership and cannot elevate the default role", async () => {
    const t = convexTest(schema, modules);
    await provision(t);
    await expect(
      t.mutation(internal.identity.provisionValidatedIdentity, {
        providerKey,
        providerSubjectHash,
        identityKey: "opaque-platform-identity-0002",
        displayName: "Attacker",
      }),
    ).rejects.toThrow("already linked to another identity");
    const profile = await t.run(async (ctx) => ctx.db.query("userProfiles").unique());
    expect(profile?.primaryRole).toBe("user");
  });

  it("validates, rotates, expires, and revokes sessions using token hashes", async () => {
    const t = convexTest(schema, modules);
    await provision(t);
    const now = Date.now();
    await t.mutation(internal.identity.createSession, {
      identityKey,
      tokenHash,
      expiresAt: now + 60_000,
      refreshExpiresAt: now + 120_000,
    });
    await expect(
      t.mutation(internal.identity.validateSession, { tokenHash, now: now + 1 }),
    ).resolves.toMatchObject({ valid: true, reason: "valid", identityKey });

    const replacementHash = "c".repeat(64);
    await t.mutation(internal.identity.refreshSession, {
      currentTokenHash: tokenHash,
      newTokenHash: replacementHash,
      expiresAt: now + 90_000,
      refreshExpiresAt: now + 180_000,
      now: now + 2,
    });
    await expect(
      t.mutation(internal.identity.validateSession, { tokenHash, now: now + 3 }),
    ).resolves.toMatchObject({ valid: false, reason: "revoked" });
    await expect(
      t.mutation(internal.identity.validateSession, {
        tokenHash: replacementHash,
        now: now + 90_001,
      }),
    ).resolves.toMatchObject({ valid: false, reason: "expired" });

    await t.mutation(internal.identity.revokeSession, {
      tokenHash: replacementHash,
      now: now + 90_002,
    });
    await expect(
      t.mutation(internal.identity.validateSession, {
        tokenHash: replacementHash,
        now: now + 90_003,
      }),
    ).resolves.toMatchObject({ valid: false, reason: "revoked" });
  });

  it("treats absent sessions as unauthorized without creating records", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.identity.validateSession, {
        tokenHash: "d".repeat(64),
      }),
    ).resolves.toEqual({ valid: false, reason: "not_found" });
    expect(await t.run(async (ctx) => ctx.db.query("identitySessions").collect())).toHaveLength(0);
  });
});
