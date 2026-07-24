/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("observability storage", () => {
  it("stores privacy-safe, templated product usage", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("userProfiles", {
        name: "Analytics recipient",
        primaryRole: "user",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    });

    await t.mutation(internal.observability.recordUsageInternal, {
      userId,
      name: "property_viewed",
      route: "/property/private-property-id?token=secret",
      properties: { source: "housing", count: 1, email: "user@example.com" },
      environment: "test",
    });
    const event = await t.run(async (ctx) => ctx.db.query("usageAnalyticsEvents").unique());

    expect(event).toMatchObject({
      userId,
      name: "property_viewed",
      route: "/property/:id",
      properties: { source: "housing", count: 1 },
      environment: "test",
    });
  });

  it("records bounded, redacted audit metadata", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.observability.recordAudit, {
      actorType: "system",
      action: "observability.configuration.checked",
      targetTable: "settings",
      targetId: "monitoring",
      metadata: { status: "ready", token: "secret", email: "user@example.com" },
    });
    const event = await t.run(async (ctx) => ctx.db.query("auditEvents").unique());

    expect(event).toMatchObject({
      actorType: "system",
      action: "observability.configuration.checked",
      metadata: { status: "ready" },
    });
  });

  it("rejects unknown product analytics events", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("userProfiles", {
        name: "Analytics recipient",
        primaryRole: "user",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      t.mutation(internal.observability.recordUsageInternal, {
        userId,
        name: "private.dynamic.event",
        environment: "test",
      }),
    ).rejects.toThrow("Unsupported analytics event");
  });
});
