/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("initial administrator bootstrap", () => {
  it("promotes one existing authenticated account once without creating a user", async () => {
    const t = convexTest(schema, modules);
    const setup = await t.run(async (ctx) => {
      const now = Date.now();
      const authUserId = await ctx.db.insert("users", { phone: "+966582968140" });
      const profileId = await ctx.db.insert("userProfiles", {
        authUserId,
        identityKey: "issuer.example|initial-admin-subject",
        name: "Initial administrator",
        phone: "+966582968140",
        primaryRole: "user",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const ordinaryAuthUserId = await ctx.db.insert("users", { phone: "+966500000001" });
      await ctx.db.insert("userProfiles", {
        authUserId: ordinaryAuthUserId,
        name: "Ordinary user",
        phone: "+966500000001",
        primaryRole: "user",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      return { authUserId, profileId, ordinaryAuthUserId };
    });

    const first = await t.mutation(internal.bootstrap.initialAdmin, {
      identityKey: "issuer.example|initial-admin-subject",
    });
    const second = await t.mutation(internal.bootstrap.initialAdmin, {
      identityKey: "issuer.example|different-subject",
    });
    expect(first.profileId).toBe(setup.profileId);
    expect(first.alreadyCompleted).toBe(false);
    expect(second.profileId).toBe(setup.profileId);
    expect(second.alreadyCompleted).toBe(true);

    const state = await t.run(async (ctx) => ({
      users: await ctx.db.query("users").take(10),
      profile: await ctx.db.get("userProfiles", setup.profileId),
      assignments: await ctx.db.query("roleAssignments").take(10),
      runs: await ctx.db.query("bootstrapRuns").take(10),
    }));
    expect(state.users).toHaveLength(2);
    expect(state.profile?.primaryRole).toBe("admin");
    expect(state.assignments).toHaveLength(1);
    expect(state.runs).toHaveLength(1);

    await expect(
      t.withIdentity({ subject: setup.ordinaryAuthUserId }).query(api.admin.overview, {}),
    ).rejects.toThrow("Administrator access required");
    await expect(
      t.withIdentity({ subject: setup.authUserId }).query(api.admin.overview, {}),
    ).resolves.toBeDefined();
    await expect(
      t.withIdentity({ subject: setup.authUserId }).mutation(api.admin.updateUserStatus, {
        userId: setup.profileId,
        status: "suspended",
      }),
    ).rejects.toThrow("cannot suspend their own account");
  });
});
