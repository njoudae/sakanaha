/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedBusiness(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const ownerIdentityKey = "phase4-owner-identity-000001";
    const requesterIdentityKey = "phase4-requester-identity-001";
    const adminIdentityKey = "phase4-admin-identity-000001";
    const ownerUserId = await ctx.db.insert("userProfiles", {
      identityKey: ownerIdentityKey,
      name: "Owner",
      primaryRole: "real_estate_agent",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const requesterUserId = await ctx.db.insert("userProfiles", {
      identityKey: requesterIdentityKey,
      name: "Requester",
      primaryRole: "user",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const adminUserId = await ctx.db.insert("userProfiles", {
      identityKey: adminIdentityKey,
      name: "Admin",
      primaryRole: "admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const ownerProfileId = await ctx.db.insert("ownerProfiles", {
      userId: ownerUserId,
      fullName: "Verified Owner",
      phone: "test-owner-phone",
      verificationStatus: "verified",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const propertyId = await ctx.db.insert("properties", {
      ownerProfileId,
      title: "Published property",
      propertyLicenseNumber: "LIC-PHASE4",
      region: "Riyadh",
      city: "Riyadh",
      neighborhood: "Almalqa",
      district: "Almalqa",
      address: "Riyadh",
      universityNearby: "University",
      lat: 24.7,
      lng: 46.6,
      locationVisibility: "exact",
      locationQuality: "verified",
      classification: "families",
      propertyType: "apartment",
      minRooms: 1,
      maxRooms: 2,
      floorsCount: 1,
      hasElevator: true,
      hasCleaningWorker: false,
      hasTransportService: false,
      universityBusPasses: false,
      bathrooms: 1,
      furnished: true,
      maxResidents: 2,
      totalUnits: 1,
      availableUnits: 1,
      availabilityStatus: "available",
      roommateAllowed: true,
      requiresLeaseContract: true,
      price: 2500,
      paymentType: "monthly",
      rentalPrices: { monthly: 2500, yearly: 25000 },
      negotiable: false,
      allowWhatsappContact: true,
      status: "published",
      publicationStatus: "approved",
      moderationStatus: "approved",
      workflowStatus: "published",
      paymentStatus: "paid",
      paymentCompleted: true,
      searchText: "Published property Riyadh Almalqa",
      createdAt: now,
      updatedAt: now,
    });
    return {
      ownerIdentityKey,
      requesterIdentityKey,
      adminIdentityKey,
      ownerUserId,
      requesterUserId,
      adminUserId,
      ownerProfileId,
      propertyId,
    };
  });
}

describe("Phase 4 business workflows", () => {
  it("enforces booking ownership and preserves property inventory", async () => {
    const t = convexTest(schema, modules);
    const setup = await seedBusiness(t);
    const requester = t.withIdentity({
      subject: "requester",
      identityKey: setup.requesterIdentityKey,
    });
    const owner = t.withIdentity({ subject: "owner", identityKey: setup.ownerIdentityKey });
    const bookingId = await requester.mutation(api.bookings.request, {
      propertyId: setup.propertyId,
      startDate: "2026-09-01",
      pricingPeriod: "monthly",
      note: "Ready to move",
    });
    await expect(
      requester.mutation(api.bookings.respond, {
        bookingId,
        decision: "confirmed",
      }),
    ).rejects.toThrow("Only the property owner");
    await owner.mutation(api.bookings.respond, {
      bookingId,
      decision: "confirmed",
    });
    expect(
      await t.run(
        async (ctx) => (await ctx.db.get("properties", setup.propertyId))?.availableUnits,
      ),
    ).toBe(0);
    await requester.mutation(api.bookings.cancel, { bookingId, reason: "Plans changed" });
    const result = await t.run(async (ctx) => ({
      booking: await ctx.db.get("bookings", bookingId),
      property: await ctx.db.get("properties", setup.propertyId),
    }));
    expect(result.booking?.status).toBe("cancelled");
    expect(result.property?.availableUnits).toBe(1);
  });

  it("derives fees server-side and never bypasses roommate moderation after payment", async () => {
    const t = convexTest(schema, modules);
    const setup = await seedBusiness(t);
    const now = Date.now();
    const requestId = await t.run(
      async (ctx) =>
        await ctx.db.insert("roommateRequests", {
          userId: setup.requesterUserId,
          source: "external_property",
          userType: "student",
          age: 22,
          organization: "University",
          moveInDate: "2026-09-01",
          bio: "Looking for a roommate",
          availableRooms: 1,
          pricePerPerson: 1500,
          region: "Riyadh",
          city: "Riyadh",
          district: "Almalqa",
          externalHousing: {
            city: "Riyadh",
            district: "Almalqa",
            approximateLocation: "North Riyadh",
            approximateLat: 24.7,
            approximateLng: 46.6,
          },
          workflowStatus: "draft",
          paymentStatus: "unpaid",
          publicationStatus: "draft",
          status: "hidden",
          moderationStatus: "pending",
          createdAt: now,
          updatedAt: now,
        }),
    );
    const requester = t.withIdentity({
      subject: "requester",
      identityKey: setup.requesterIdentityKey,
    });
    const paymentId = await requester.mutation(api.payments.createIntent, {
      entityType: "roommate_card",
      roommateRequestId: requestId,
      idempotencyKey: "phase4-roommate-payment-0001",
    });
    const payment = await t.run(async (ctx) => await ctx.db.get("payments", paymentId));
    expect(payment).toMatchObject({ amount: 15, currency: "SAR", provider: "unconfigured" });
    await t.mutation(internal.payments.recordStatus, {
      idempotencyKey: "phase4-roommate-payment-0001",
      status: "paid",
      provider: "test-adapter",
      providerReference: "verified-reference",
      reason: "Verified by payment adapter contract test",
    });
    expect(
      await t.run(async (ctx) => await ctx.db.get("roommateRequests", requestId)),
    ).toMatchObject({
      workflowStatus: "paid",
      publicationStatus: "draft",
      moderationStatus: "pending",
    });
    await requester.mutation(api.submissions.submitRoommateRequestForReview, { requestId });
    expect(
      await t.run(async (ctx) => await ctx.db.get("roommateRequests", requestId)),
    ).toMatchObject({
      workflowStatus: "pending_admin_review",
      publicationStatus: "pending_review",
      moderationStatus: "pending",
    });
    const admin = t.withIdentity({ subject: "admin", identityKey: setup.adminIdentityKey });
    await admin.mutation(api.admin.moderateRoommateRequest, {
      requestId,
      moderation: "approved",
    });
    expect(
      await t.run(async (ctx) => await ctx.db.get("roommateRequests", requestId)),
    ).toMatchObject({
      workflowStatus: "published",
      publicationStatus: "approved",
      moderationStatus: "approved",
      status: "open",
    });
  });

  it("keeps external roommate housing independent from properties", async () => {
    const t = convexTest(schema, modules);
    const setup = await seedBusiness(t);
    const requester = t.withIdentity({
      subject: "requester",
      identityKey: setup.requesterIdentityKey,
    });
    const before = await t.run(async (ctx) => await ctx.db.query("properties").take(10));
    await requester.mutation(api.roommates.createDraft, {
      source: "external_property",
      externalHousing: { city: "Abha", district: "Almansak" },
      userType: "employee",
      age: 25,
      organization: "Employer",
      moveInDate: "2026-10-01",
      bio: "External housing roommate card",
      availableRooms: 1,
      pricePerPerson: 1200,
      preferences: {
        smoking: "no",
        guests: "occasionally",
        sleep: "flexible",
        cleanliness: "average",
        pets: "not_allowed",
        cooking: "occasionally",
        occupation: "employee",
        noise: "moderate",
      },
    });
    const after = await t.run(async (ctx) => ({
      properties: await ctx.db.query("properties").take(10),
      card: await ctx.db.query("roommateRequests").unique(),
    }));
    expect(after.properties).toHaveLength(before.length);
    expect(after.card?.linkedPropertyId).toBeUndefined();
    expect(after.card?.propertyId).toBeUndefined();
    expect(after.card?.source).toBe("external_property");
  });

  it("prevents removing the last administrator role", async () => {
    const t = convexTest(schema, modules);
    const setup = await seedBusiness(t);
    const admin = t.withIdentity({ subject: "admin", identityKey: setup.adminIdentityKey });
    await expect(
      admin.mutation(api.admin.updateUserRole, {
        userId: setup.adminUserId,
        role: "user",
        reason: "Attempted self demotion",
      }),
    ).rejects.toThrow("cannot remove their own");
  });
});
