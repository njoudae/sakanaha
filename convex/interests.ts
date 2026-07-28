import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireActiveProfile } from "./lib/authorization";
import { recordBusinessAudit } from "./lib/businessEvents";

const interestMode = v.union(
  v.literal("whole-unit"),
  v.literal("roommate"),
  v.literal("visit"),
  v.literal("general"),
);

export const register = mutation({
  args: { propertyId: v.id("properties"), mode: interestMode },
  returns: v.id("interests"),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const property = await ctx.db.get("properties", args.propertyId);
    if (
      property === null ||
      property.deletedAt !== undefined ||
      property.status !== "published" ||
      property.publicationStatus !== "approved" ||
      property.workflowStatus !== "published"
    ) {
      throw new Error("Property is unavailable.");
    }
    const existing = await ctx.db
      .query("interests")
      .withIndex("by_user_created", (q) => q.eq("userId", profile._id))
      .order("desc")
      .take(100);
    const active = existing.find(
      (item) =>
        item.propertyId === property._id && item.mode === args.mode && item.status !== "closed",
    );
    if (active !== undefined) return active._id;
    const now = Date.now();
    const interestId = await ctx.db.insert("interests", {
      userId: profile._id,
      propertyId: property._id,
      mode: args.mode,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "property.interest_registered",
      entityType: "interests",
      entityId: interestId,
      reason: "User registered interest in a property",
      newValue: { propertyId: property._id, mode: args.mode },
    });
    return interestId;
  },
});

export const withdraw = mutation({
  args: { propertyId: v.id("properties") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const rows = await ctx.db
      .query("interests")
      .withIndex("by_user_created", (q) => q.eq("userId", profile._id))
      .order("desc")
      .take(100);
    const now = Date.now();
    for (const row of rows) {
      if (row.propertyId === args.propertyId && row.status !== "closed") {
        await ctx.db.patch(row._id, { status: "closed", updatedAt: now });
      }
    }
    return null;
  },
});
