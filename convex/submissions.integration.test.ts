/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("M19 submission workflow", () => {
  it("requires location and media, then places a property into review", async () => {
    const t = convexTest(schema, modules);
    const setup = await t.run(async (ctx) => {
      const now = Date.now();
      const authUserId = await ctx.db.insert("users", {});
      const userId = await ctx.db.insert("userProfiles", {
        authUserId,
        name: "Owner",
        primaryRole: "owner",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const ownerProfileId = await ctx.db.insert("ownerProfiles", {
        userId,
        fullName: "Owner",
        phone: "0500000000",
        verificationStatus: "verified",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const propertyId = await ctx.db.insert("properties", {
        ownerProfileId,
        title: "Review property",
        propertyLicenseNumber: "M19-1",
        region: "منطقة الرياض",
        city: "الرياض",
        neighborhood: "الياسمين",
        district: "الياسمين",
        address: "الرياض",
        universityNearby: "جامعة الملك سعود",
        lat: 24.72,
        lng: 46.63,
        locationVisibility: "exact",
        locationQuality: "verified",
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
        negotiable: false,
        allowWhatsappContact: false,
        status: "draft",
        publicationStatus: "draft",
        moderationStatus: "pending",
        searchText: "Review property الرياض",
        createdAt: now,
        updatedAt: now,
      });
      return { authUserId, userId, propertyId };
    });
    const owner = t.withIdentity({ subject: setup.authUserId });
    await expect(
      owner.mutation(api.submissions.submitPropertyForReview, {
        propertyId: setup.propertyId,
      }),
    ).rejects.toThrow("At least one uploaded property image");

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("propertyMedia", {
        propertyId: setup.propertyId,
        uploaderUserId: setup.userId,
        legacyUrl: "https://example.com/property.jpg",
        kind: "image",
        isCover: true,
        status: "approved",
        scanStatus: "clean",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });
    });
    await owner.mutation(api.submissions.submitPropertyForReview, {
      propertyId: setup.propertyId,
    });
    const property = await t.run(async (ctx) => await ctx.db.get("properties", setup.propertyId));
    expect(property).toMatchObject({
      status: "pending_review",
      publicationStatus: "pending_review",
      moderationStatus: "pending",
    });
    expect(property?.publishedAt).toBeUndefined();
  });
});
