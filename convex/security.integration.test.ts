/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createIdentity(
  t: ReturnType<typeof convexTest>,
  primaryRole: "admin" | "owner" | "user" | "service_provider" | "support" | "moderator",
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const authUserId = await ctx.db.insert("users", {});
    const identityKey = `test-identity-${String(authUserId)}`;
    const profileId = await ctx.db.insert("userProfiles", {
      authUserId,
      identityKey,
      name: `${primaryRole} security test`,
      primaryRole,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return { authUserId, identityKey, profileId };
  });
}

describe("M16 security boundaries", () => {
  it("rejects unauthenticated attempts to forge authentication audit events", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.authSecurity.recordAuthClientEvent, {
        event: "failed_login",
        provider: "forged",
      }),
    ).rejects.toThrow("Authentication required");
    expect(await t.run(async (ctx) => ctx.db.query("auditEvents").collect())).toHaveLength(0);
  });

  it("attributes client auth events to an active profile and redacts personal data", async () => {
    const t = convexTest(schema, modules);
    const identity = await createIdentity(t, "user");
    await t
      .withIdentity({ subject: identity.authUserId, identityKey: identity.identityKey })
      .mutation(api.authSecurity.recordAuthClientEvent, {
        event: "otp_failed",
        provider: "email-otp",
        channel: "email",
        reason: "failed for person@example.com?token=secret-value",
      });
    const event = await t.run(async (ctx) => ctx.db.query("auditEvents").unique());
    expect(event).toMatchObject({
      actorUserId: identity.profileId,
      actorType: "user",
      action: "auth.otp_failed",
    });
    expect(JSON.stringify(event?.metadata)).not.toContain("person@example.com");
    expect(JSON.stringify(event?.metadata)).not.toContain("secret-value");
  });

  it.each(["owner", "user", "service_provider", "support", "moderator"] as const)(
    "denies %s access to raw usage analytics",
    async (role) => {
      const t = convexTest(schema, modules);
      const identity = await createIdentity(t, role);
      await expect(
        t
          .withIdentity({ subject: identity.authUserId, identityKey: identity.identityKey })
          .query(api.observability.listUsage, {
            paginationOpts: { numItems: 10, cursor: null },
          }),
      ).rejects.toThrow("Observability access required");
    },
  );

  it("allows admins to inspect usage and redacts internal audit identifiers for support", async () => {
    const t = convexTest(schema, modules);
    const admin = await createIdentity(t, "admin");
    const support = await createIdentity(t, "support");
    await t.mutation(internal.observability.recordUsageInternal, {
      userId: admin.profileId,
      name: "property_viewed",
      environment: "test",
    });
    await t.mutation(internal.observability.recordAudit, {
      actorUserId: admin.profileId,
      actorType: "user",
      action: "security.authorization.checked",
      targetTable: "properties",
      targetId: "private-property-id",
    });

    const usage = await t
      .withIdentity({ subject: admin.authUserId, identityKey: admin.identityKey })
      .query(api.observability.listUsage, { paginationOpts: { numItems: 10, cursor: null } });
    expect(usage.page).toHaveLength(1);

    const audit = await t
      .withIdentity({ subject: support.authUserId, identityKey: support.identityKey })
      .query(api.observability.listAudit, { paginationOpts: { numItems: 10, cursor: null } });
    expect(audit.page[0]).not.toHaveProperty("_id");
    expect(audit.page[0]).not.toHaveProperty("_creationTime");
    expect(audit.page[0]).not.toHaveProperty("actorUserId");
    expect(audit.page[0]).not.toHaveProperty("targetId");
  });

  it("rejects malformed maps context before invoking a provider", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.maps.geocode, {
        query: "Abha university",
        context: { language: "ar\r\nx-injected: true" },
      }),
    ).rejects.toThrow("Maps language is invalid");
  });
});
