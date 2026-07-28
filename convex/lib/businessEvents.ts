import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function recordBusinessAudit(
  ctx: MutationCtx,
  input: {
    actorUserId: Id<"userProfiles">;
    actorType: "user" | "admin" | "system";
    action: string;
    entityType: string;
    entityId: string;
    reason: string;
    previousValue?: unknown;
    newValue?: unknown;
  },
) {
  const now = Date.now();
  await ctx.db.insert("auditEvents", {
    actorUserId: input.actorUserId,
    adminId: input.actorType === "admin" ? input.actorUserId : undefined,
    actorType: input.actorType,
    action: input.action,
    entity: `${input.entityType}:${input.entityId}`,
    targetTable: input.entityType,
    targetId: input.entityId,
    entityType: input.entityType,
    entityId: input.entityId,
    timestamp: now,
    reason: input.reason,
    previousValue: input.previousValue,
    newValue: input.newValue,
    createdAt: now,
  });
}

export async function enqueueBusinessNotification(
  ctx: MutationCtx,
  input: {
    userId: Id<"userProfiles">;
    idempotencyKey: string;
    type: string;
    title: string;
    body: string;
    deepLink?: string;
    relatedPropertyId?: Id<"properties">;
  },
) {
  await ctx.scheduler.runAfter(0, internal.notificationState.enqueue, {
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
    type: input.type,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink,
    relatedPropertyId: input.relatedPropertyId,
    priority: "normal",
  });
}
