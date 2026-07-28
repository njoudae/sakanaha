import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveProfile, requireAdmin } from "./lib/authorization";
import { enqueueBusinessNotification, recordBusinessAudit } from "./lib/businessEvents";
import { ownerStatus, verificationStatus } from "./validators";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireActiveProfile(ctx);
    return await ctx.db
      .query("ownerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", profile._id))
      .unique();
  },
});

export const saveMine = mutation({
  args: {
    fullName: v.string(),
    phone: v.string(),
    ministryPropertyNumber: v.optional(v.string()),
  },
  returns: v.id("ownerProfiles"),
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const fullName = args.fullName.trim().slice(0, 120);
    const phone = args.phone.trim().slice(0, 30);
    const ministryPropertyNumber = args.ministryPropertyNumber?.trim().slice(0, 80);
    if (!fullName || !phone) throw new Error("Agent name and contact phone are required.");
    const existing = await ctx.db
      .query("ownerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", profile._id))
      .unique();
    const now = Date.now();
    if (existing !== null) {
      if (existing.status === "deleted") throw new Error("Agent profile is unavailable.");
      await ctx.db.patch(existing._id, {
        fullName,
        phone,
        ministryPropertyNumber: ministryPropertyNumber || undefined,
        updatedAt: now,
      });
      return existing._id;
    }
    const id = await ctx.db.insert("ownerProfiles", {
      userId: profile._id,
      fullName,
      phone,
      ministryPropertyNumber: ministryPropertyNumber || undefined,
      verificationStatus: "pending",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: profile._id,
      actorType: "user",
      action: "agent.profile.created",
      entityType: "ownerProfiles",
      entityId: id,
      reason: "User created an agent profile",
      newValue: { verificationStatus: "pending", status: "active" },
    });
    return id;
  },
});

export const listForAdmin = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(ownerStatus),
    verification: v.optional(verificationStatus),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.verification !== undefined) {
      return await ctx.db
        .query("ownerProfiles")
        .withIndex("by_verification_status", (q) => q.eq("verificationStatus", args.verification!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (args.status !== undefined) {
      return await ctx.db
        .query("ownerProfiles")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("ownerProfiles").order("desc").paginate(args.paginationOpts);
  },
});

export const moderate = mutation({
  args: {
    ownerProfileId: v.id("ownerProfiles"),
    verification: verificationStatus,
    status: ownerStatus,
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const agent = await ctx.db.get("ownerProfiles", args.ownerProfileId);
    if (agent === null) throw new Error("Agent not found.");
    const reason = args.reason.trim().slice(0, 500);
    if (!reason) throw new Error("A moderation reason is required.");
    const now = Date.now();
    await ctx.db.patch(agent._id, {
      verificationStatus: args.verification,
      status: args.status,
      deletedAt: args.status === "deleted" ? now : undefined,
      updatedAt: now,
    });
    await recordBusinessAudit(ctx, {
      actorUserId: admin._id,
      actorType: "admin",
      action: "admin.agent.moderated",
      entityType: "ownerProfiles",
      entityId: agent._id,
      reason,
      previousValue: {
        verificationStatus: agent.verificationStatus,
        status: agent.status,
      },
      newValue: { verificationStatus: args.verification, status: args.status },
    });
    await enqueueBusinessNotification(ctx, {
      userId: agent.userId,
      idempotencyKey: `agent:${agent._id}:moderation:${args.verification}:${args.status}:${now}`,
      type: "agent.moderated",
      title: "تحديث حالة حساب الوسيط",
      body: `تم تحديث التحقق إلى ${args.verification} والحالة إلى ${args.status}.`,
      deepLink: "/owner/dashboard",
    });
    return null;
  },
});
