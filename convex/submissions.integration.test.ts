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
      const identityKey = `test-identity-${String(authUserId)}`;
      const userId = await ctx.db.insert("userProfiles", {
        authUserId,
        identityKey,
        name: "Owner",
        primaryRole: "real_estate_agent",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const ownerProfileId = await ctx.db.insert("ownerProfiles", {
        userId,
        fullName: "Owner",
        phone: "test-owner-phone",
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
        paymentStatus: "paid",
        moderationStatus: "pending",
        searchText: "Review property الرياض",
        createdAt: now,
        updatedAt: now,
      });
      return { authUserId, identityKey, userId, propertyId };
    });
    const owner = t.withIdentity({
      subject: setup.authUserId,
      identityKey: setup.identityKey,
    });
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

  it("never bypasses property or roommate moderation based on phone or payment", async () => {
    const t = convexTest(schema, modules);
    const setup = await t.run(async (ctx) => {
      const now = Date.now();
      const authUserId = await ctx.db.insert("users", {});
      const identityKey = `test-identity-${String(authUserId)}`;
      const userId = await ctx.db.insert("userProfiles", {
        authUserId,
        identityKey,
        name: "Direct approval account",
        phone: "+966582968140",
        primaryRole: "real_estate_agent",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const ownerProfileId = await ctx.db.insert("ownerProfiles", {
        userId,
        fullName: "Direct approval account",
        phone: "test-owner-phone",
        verificationStatus: "verified",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const propertyId = await ctx.db.insert("properties", {
        ownerProfileId,
        title: "Direct approval property",
        propertyLicenseNumber: "AUTO-1",
        region: "Aseer",
        city: "Abha",
        neighborhood: "Al Manhal",
        district: "Al Manhal",
        address: "Abha",
        universityNearby: "King Khalid University",
        lat: 18.24,
        lng: 42.51,
        locationVisibility: "exact",
        locationQuality: "verified",
        classification: "women",
        propertyType: "apartment",
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
        paymentType: "monthly",
        negotiable: false,
        allowWhatsappContact: false,
        status: "draft",
        publicationStatus: "draft",
        paymentStatus: "paid",
        moderationStatus: "pending",
        searchText: "Direct approval property Abha",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("propertyMedia", {
        propertyId,
        uploaderUserId: userId,
        legacyUrl: "https://example.com/property.jpg",
        kind: "image",
        isCover: true,
        status: "approved",
        scanStatus: "clean",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });
      const requestId = await ctx.db.insert("roommateRequests", {
        propertyId,
        userId,
        userType: "student",
        age: 22,
        organization: "King Khalid University",
        moveInDate: "2026-09-01",
        bio: "Looking for a roommate",
        availableRooms: 1,
        region: "Aseer",
        city: "Abha",
        district: "Al Manhal",
        approximateLat: 18.24,
        approximateLng: 42.51,
        publicationStatus: "draft",
        paymentStatus: "paid",
        status: "open",
        moderationStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });
      return { authUserId, identityKey, propertyId, requestId };
    });

    const account = t.withIdentity({
      subject: setup.authUserId,
      identityKey: setup.identityKey,
    });
    await account.mutation(api.submissions.submitPropertyForReview, {
      propertyId: setup.propertyId,
    });
    await account.mutation(api.submissions.submitRoommateRequestForReview, {
      requestId: setup.requestId,
    });

    const state = await t.run(async (ctx) => ({
      property: await ctx.db.get("properties", setup.propertyId),
      request: await ctx.db.get("roommateRequests", setup.requestId),
    }));
    expect(state.property).toMatchObject({
      status: "pending_review",
      workflowStatus: "pending_admin_review",
      publicationStatus: "pending_review",
      moderationStatus: "pending",
    });
    expect(state.property?.publishedAt).toBeUndefined();
    expect(state.request).toMatchObject({
      workflowStatus: "pending_admin_review",
      publicationStatus: "pending_review",
      moderationStatus: "pending",
    });
    expect(state.request?.reviewedAt).toBeUndefined();
  });
});
