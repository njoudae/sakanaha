import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { mockUniversities, mockUniversitiesCatalog } from "@saknaha/constants/mockUniversities";

function validLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function validLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function validCoordinates(latitude: number, longitude: number) {
  return (
    validLatitude(latitude) && validLongitude(longitude) && !(latitude === 0 && longitude === 0)
  );
}

export const listActiveBranches = query({
  args: { city: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const branches = args.city
      ? await ctx.db
          .query("universityBranches")
          .withIndex("by_city_and_active", (q) => q.eq("city", args.city!).eq("active", true))
          .take(200)
      : await ctx.db
          .query("universityBranches")
          .withIndex("by_active", (q) => q.eq("active", true))
          .take(200);

    return await Promise.all(
      branches.map(async (branch) => {
        const university = await ctx.db.get(branch.universityId);
        return {
          id: branch.externalId,
          universityId: university?.externalId ?? "",
          universityName: university?.name ?? "",
          region: branch.region ?? university?.region,
          name: branch.name,
          city: branch.city,
          latitude: branch.latitude,
          longitude: branch.longitude,
          active:
            branch.active &&
            Boolean(university?.active) &&
            validCoordinates(branch.latitude, branch.longitude),
        };
      }),
    );
  },
});

export const currentSelectedBranch = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (!profile?.selectedUniversityBranchId) return null;
    const branch = await ctx.db.get(profile.selectedUniversityBranchId);
    if (!branch?.active || !validCoordinates(branch.latitude, branch.longitude)) return null;
    const university = await ctx.db.get(branch.universityId);
    if (!university?.active) return null;
    return {
      id: branch.externalId,
      universityId: university.externalId,
      universityName: university.name,
      region: branch.region ?? university.region,
      name: branch.name,
      city: branch.city,
      latitude: branch.latitude,
      longitude: branch.longitude,
      active: true,
    };
  },
});

export const saveSelectedBranch = mutation({
  args: { branchExternalId: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) throw new Error("Authentication required.");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (profile === null) throw new Error("User profile not found.");

    if (args.branchExternalId === null) {
      await ctx.db.patch(profile._id, {
        selectedUniversityBranchId: undefined,
        updatedAt: Date.now(),
      });
      return null;
    }

    let branch = await ctx.db
      .query("universityBranches")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.branchExternalId!))
      .unique();
    if (branch === null) {
      const catalogBranch = mockUniversities.find(
        (item) => item.id === args.branchExternalId && item.active,
      );
      const catalogUniversity = catalogBranch
        ? mockUniversitiesCatalog.find(
            (item) => item.id === catalogBranch.universityId && item.active,
          )
        : null;
      if (catalogBranch && catalogUniversity) {
        const now = Date.now();
        const existingUniversity = await ctx.db
          .query("universities")
          .withIndex("by_external_id", (q) => q.eq("externalId", catalogUniversity.id))
          .unique();
        const universityId =
          existingUniversity?._id ??
          (await ctx.db.insert("universities", {
            externalId: catalogUniversity.id,
            name: catalogUniversity.name,
            region: catalogUniversity.region,
            city: catalogUniversity.city,
            active: true,
            createdAt: now,
            updatedAt: now,
          }));
        const branchId = await ctx.db.insert("universityBranches", {
          universityId,
          externalId: catalogBranch.id,
          name: catalogBranch.name,
          region: catalogUniversity.region,
          city: catalogBranch.city,
          latitude: catalogBranch.lat,
          longitude: catalogBranch.lng,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
        branch = await ctx.db.get(branchId);
      }
    }
    if (branch === null || !branch.active) throw new Error("University branch is unavailable.");
    if (!validCoordinates(branch.latitude, branch.longitude)) {
      throw new Error("University branch coordinates are invalid.");
    }

    await ctx.db.patch(profile._id, {
      selectedUniversityBranchId: branch._id,
      updatedAt: Date.now(),
    });
    return branch._id;
  },
});

export const seedCatalog = internalMutation({
  args: {
    universities: v.array(
      v.object({
        externalId: v.string(),
        name: v.string(),
        region: v.optional(v.string()),
        city: v.string(),
        active: v.boolean(),
      }),
    ),
    branches: v.array(
      v.object({
        externalId: v.string(),
        universityExternalId: v.string(),
        name: v.string(),
        region: v.optional(v.string()),
        city: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        active: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.universities.length > 100 || args.branches.length > 500) {
      throw new Error("Seed batch is too large.");
    }
    const now = Date.now();
    const universityIds = new Map<string, Id<"universities">>();

    for (const university of args.universities) {
      const existing = await ctx.db
        .query("universities")
        .withIndex("by_external_id", (q) => q.eq("externalId", university.externalId))
        .unique();
      const id = existing
        ? (await ctx.db.patch(existing._id, { ...university, updatedAt: now }), existing._id)
        : await ctx.db.insert("universities", { ...university, createdAt: now, updatedAt: now });
      universityIds.set(university.externalId, id);
    }

    for (const branch of args.branches) {
      if (!validCoordinates(branch.latitude, branch.longitude)) continue;
      const universityId = universityIds.get(branch.universityExternalId);
      if (!universityId) continue;
      const existing = await ctx.db
        .query("universityBranches")
        .withIndex("by_external_id", (q) => q.eq("externalId", branch.externalId))
        .unique();
      const value = {
        universityId,
        externalId: branch.externalId,
        name: branch.name,
        region: branch.region,
        city: branch.city,
        latitude: branch.latitude,
        longitude: branch.longitude,
        active: branch.active,
        updatedAt: now,
      };
      if (existing) await ctx.db.patch(existing._id, value);
      else await ctx.db.insert("universityBranches", { ...value, createdAt: now });
    }
    return null;
  },
});
