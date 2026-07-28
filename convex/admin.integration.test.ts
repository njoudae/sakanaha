/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createProfile(
  t: ReturnType<typeof convexTest>,
  role: "admin" | "user",
  name: string,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const authUserId = await ctx.db.insert("users", {});
    const identityKey = `test-identity-${String(authUserId)}`;
    const profileId = await ctx.db.insert("userProfiles", {
      authUserId,
      identityKey,
      name,
      primaryRole: role,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return { authUserId, identityKey, profileId };
  });
}

describe("admin dashboard API", () => {
  it("rejects unauthenticated and non-admin access", async () => {
    const t = convexTest(schema, modules);
    const user = await createProfile(t, "user", "Regular user");
    await expect(t.query(api.admin.overview, {})).rejects.toThrow("Authentication required");
    await expect(
      t
        .withIdentity({ subject: user.authUserId, identityKey: user.identityKey })
        .query(api.admin.overview, {}),
    ).rejects.toThrow("Administrator access required");
  });

  it("returns overview data and applies protected moderation actions", async () => {
    const t = convexTest(schema, modules);
    const admin = await createProfile(t, "admin", "Admin");
    const user = await createProfile(t, "user", "User");
    const propertyId = await t.run(async (ctx) => {
      const now = Date.now();
      const ownerProfileId = await ctx.db.insert("ownerProfiles", {
        userId: user.profileId,
        fullName: "Owner",
        phone: "0500000000",
        verificationStatus: "verified",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.insert("properties", {
        ownerProfileId,
        title: "Pending property",
        propertyLicenseNumber: "M18-1",
        city: "أبها",
        neighborhood: "المنسك",
        address: "أبها",
        universityNearby: "جامعة الملك خالد",
        locationQuality: "manual",
        classification: "عوائل",
        propertyType: "شقة",
        minRooms: 1,
        maxRooms: 2,
        floorsCount: 1,
        hasElevator: false,
        hasCleaningWorker: false,
        hasTransportService: false,
        universityBusPasses: false,
        bathrooms: 1,
        furnished: true,
        maxResidents: 2,
        roommateAllowed: true,
        requiresLeaseContract: true,
        price: 2000,
        paymentType: "شهري",
        rentalPrices: { monthly: 2000, yearly: 18000 },
        negotiable: false,
        allowWhatsappContact: false,
        status: "draft",
        moderationStatus: "pending",
        searchText: "Pending property أبها",
        createdAt: now,
        updatedAt: now,
      });
    });

    const authenticated = t.withIdentity({
      subject: admin.authUserId,
      identityKey: admin.identityKey,
    });
    const overview = await authenticated.query(api.admin.overview, {});
    expect(overview.users.value).toBe(2);
    expect(overview.owners.value).toBe(1);
    expect(overview.properties.value).toBe(1);
    expect(overview.pendingPropertyApprovals.value).toBe(1);

    await authenticated.mutation(api.admin.moderateProperty, {
      propertyId,
      moderation: "approved",
    });
    await authenticated.mutation(api.admin.updateUserStatus, {
      userId: user.profileId,
      status: "suspended",
    });

    const state = await t.run(async (ctx) => ({
      property: await ctx.db.get("properties", propertyId),
      user: await ctx.db.get("userProfiles", user.profileId),
      audits: await ctx.db.query("auditEvents").take(10),
    }));
    expect(state.property?.moderationStatus).toBe("approved");
    expect(state.user?.status).toBe("suspended");
    expect(state.audits).toHaveLength(2);
  });
});
