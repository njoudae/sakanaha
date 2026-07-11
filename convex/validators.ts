import { v } from "convex/values";

export const platformRole = v.union(
  v.literal("admin"),
  v.literal("support"),
  v.literal("moderator"),
  v.literal("owner"),
  v.literal("user"),
  v.literal("service_provider"),
);

export const profileStatus = v.union(
  v.literal("active"),
  v.literal("pending_claim"),
  v.literal("suspended"),
  v.literal("deleted"),
);

export const verificationStatus = v.union(
  v.literal("unverified"),
  v.literal("pending"),
  v.literal("verified"),
  v.literal("rejected"),
);

export const ownerStatus = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("deleted"),
);

export const serviceProviderStatus = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("suspended"),
  v.literal("deleted"),
);

export const roleScope = v.union(
  v.literal("global"),
  v.literal("owner_profile"),
  v.literal("property"),
  v.literal("service_provider_profile"),
  v.literal("service_offering"),
);

export const roleAssignmentStatus = v.union(v.literal("active"), v.literal("disabled"));

export const listingStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("paused"),
  v.literal("archived"),
  v.literal("rejected"),
);

export const moderationStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("needs_review"),
);

export const locationQuality = v.union(
  v.literal("manual"),
  v.literal("geocoded"),
  v.literal("verified"),
  v.literal("approximate"),
);

export const distanceUnit = v.union(
  v.literal("meter"),
  v.literal("kilometer"),
  v.literal("walking_minutes"),
  v.literal("driving_minutes"),
  v.literal("hour"),
);

export const mediaKind = v.union(v.literal("image"), v.literal("video"));

export const mediaStatus = v.union(
  v.literal("pending_upload"),
  v.literal("uploaded"),
  v.literal("processing"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("quarantined"),
  v.literal("deleted"),
);

export const scanStatus = v.union(
  v.literal("not_required"),
  v.literal("pending"),
  v.literal("clean"),
  v.literal("failed"),
  v.literal("infected"),
);

export const servicePricingUnit = v.union(
  v.literal("fixed"),
  v.literal("hourly"),
  v.literal("daily"),
  v.literal("quote"),
);

export const serviceRequestStatus = v.union(
  v.literal("new"),
  v.literal("accepted"),
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("closed"),
);

export const interestMode = v.union(
  v.literal("whole-unit"),
  v.literal("roommate"),
  v.literal("visit"),
  v.literal("general"),
);

export const interestStatus = v.union(
  v.literal("new"),
  v.literal("seen"),
  v.literal("contacted"),
  v.literal("closed"),
);

export const userType = v.union(v.literal("student"), v.literal("employee"));

export const negotiationStatus = v.union(
  v.literal("sent"),
  v.literal("seen"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("closed"),
);

export const providerCapability = v.union(
  v.literal("maps"),
  v.literal("sms"),
  v.literal("storage"),
  v.literal("email"),
  v.literal("push"),
  v.literal("convex"),
  v.literal("analytics"),
  v.literal("monitoring"),
);

export const providerOperationStatus = v.union(
  v.literal("success"),
  v.literal("failed"),
  v.literal("skipped"),
);

export const otpChannel = v.union(v.literal("email"), v.literal("sms"));

export const otpStatus = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("expired"),
  v.literal("locked"),
  v.literal("cancelled"),
);

export const smsPurpose = v.union(
  v.literal("otp"),
  v.literal("notification"),
  v.literal("support"),
);

export const smsStatus = v.union(
  v.literal("queued"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("delivered"),
  v.literal("expired"),
  v.literal("undelivered"),
  v.literal("cancelled"),
);

export const rateLimitScope = v.union(
  v.literal("ip"),
  v.literal("user"),
  v.literal("phone"),
  v.literal("email"),
  v.literal("provider"),
  v.literal("global"),
);

export const notificationStatus = v.union(
  v.literal("unread"),
  v.literal("read"),
  v.literal("archived"),
);

export const notificationPriority = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
);

export const notificationChannel = v.union(
  v.literal("inApp"),
  v.literal("email"),
  v.literal("sms"),
  v.literal("push"),
);

export const deliveryStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("skipped"),
  v.literal("cancelled"),
);

export const jobStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("dead_letter"),
  v.literal("cancelled"),
);

export const actorType = v.union(
  v.literal("user"),
  v.literal("system"),
  v.literal("provider"),
  v.literal("admin"),
  v.literal("support"),
  v.literal("moderator"),
);

export const migrationBatchStatus = v.union(
  v.literal("dry_run"),
  v.literal("approved"),
  v.literal("importing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("rolled_back"),
);

export const migrationRecordStatus = v.union(
  v.literal("accepted"),
  v.literal("skipped"),
  v.literal("imported"),
  v.literal("updated"),
  v.literal("quarantined"),
  v.literal("failed"),
);

export const featureFlagScope = v.union(
  v.literal("global"),
  v.literal("user"),
  v.literal("owner_profile"),
  v.literal("property"),
  v.literal("service_provider_profile"),
);

export const notificationChannels = v.object({
  inApp: v.boolean(),
  email: v.boolean(),
  sms: v.boolean(),
  push: v.boolean(),
});

export const quietHours = v.object({
  timezone: v.string(),
  startMinutes: v.number(),
  endMinutes: v.number(),
});
