/// <reference types="vite/client" />

import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createUser(
  t: TestConvex<typeof schema>,
  values: { email?: string; phone?: string } = {},
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("userProfiles", {
      name: "Test recipient",
      email: values.email,
      phone: values.phone,
      primaryRole: "user",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
}

describe("notification queue", () => {
  it("creates one in-app notification and idempotent channel deliveries", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, { email: "recipient@example.test" });
    const args = {
      userId,
      idempotencyKey: "property:one:published:user:one",
      type: "property.published",
      title: "تم نشر السكن",
      body: "أصبح إعلان السكن متاحًا الآن.",
      deepLink: "/property/property-one",
      priority: "normal" as const,
    };

    const first = await t.mutation(internal.notificationState.enqueue, args);
    const duplicate = await t.mutation(internal.notificationState.enqueue, args);
    const state = await t.run(async (ctx) => ({
      notifications: await ctx.db.query("notifications").collect(),
      deliveries: await ctx.db.query("notificationDeliveries").collect(),
    }));

    expect(first.duplicate).toBe(false);
    expect(duplicate).toEqual({ notificationId: first.notificationId, duplicate: true });
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).toMatchObject({ status: "unread", type: "property.published" });
    expect(state.deliveries).toHaveLength(3);
    expect(state.deliveries.map(({ channel, status }) => ({ channel, status }))).toEqual([
      { channel: "inApp", status: "sent" },
      { channel: "email", status: "pending" },
      { channel: "sms", status: "skipped" },
    ]);
  });

  it("enforces event and channel preferences before queueing", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, {
      email: "recipient@example.test",
      phone: "+966500000000",
    });
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("notificationPreferences", {
        userId,
        channels: { inApp: true, email: false, sms: true, push: false },
        eventTypes: { "property.published": false },
        createdAt: now,
        updatedAt: now,
      });
    });

    await t.mutation(internal.notificationState.enqueue, {
      userId,
      idempotencyKey: "property:two:published:user:two",
      type: "property.published",
      title: "تم نشر السكن",
      body: "أصبح إعلان السكن متاحًا الآن.",
      priority: "normal",
    });
    const state = await t.run(async (ctx) => ({
      notification: await ctx.db.query("notifications").first(),
      deliveries: await ctx.db.query("notificationDeliveries").collect(),
    }));

    expect(state.notification?.status).toBe("archived");
    expect(state.deliveries.every((delivery) => delivery.status === "skipped")).toBe(true);
    expect(state.deliveries.every((delivery) => delivery.lastError === "event_disabled")).toBe(
      true,
    );
  });

  it("atomically leases due work and schedules bounded retries", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, { email: "recipient@example.test" });
    await t.mutation(internal.notificationState.enqueue, {
      userId,
      idempotencyKey: "property:three:published:user:three",
      type: "property.published",
      title: "تم نشر السكن",
      body: "أصبح إعلان السكن متاحًا الآن.",
      priority: "normal",
    });
    const emailDelivery = await t.run(async (ctx) =>
      ctx.db
        .query("notificationDeliveries")
        .withIndex("by_user_channel", (q) => q.eq("userId", userId).eq("channel", "email"))
        .unique(),
    );
    expect(emailDelivery).not.toBeNull();
    const now = Date.now() + 1;
    const firstClaim = await t.mutation(internal.notificationState.claim, {
      deliveryId: emailDelivery!._id,
      now,
    });
    const competingClaim = await t.mutation(internal.notificationState.claim, {
      deliveryId: emailDelivery!._id,
      now,
    });
    expect(firstClaim?.attemptCount).toBe(1);
    expect(competingClaim).toBeNull();

    const retry = await t.mutation(internal.notificationState.failOrRetry, {
      deliveryId: emailDelivery!._id,
      provider: "webhook",
      errorCode: "webhook:503",
      temporary: true,
    });
    const updated = await t.run(async (ctx) => ctx.db.get(emailDelivery!._id));
    expect(retry).toEqual({ exhausted: false });
    expect(updated).toMatchObject({ status: "pending", attemptCount: 1, lastError: "webhook:503" });
    expect(updated?.nextAttemptAt).toBeGreaterThan(now);
  });
});
