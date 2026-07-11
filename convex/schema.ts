import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  actorType,
  deliveryStatus,
  distanceUnit,
  featureFlagScope,
  interestMode,
  interestStatus,
  jobStatus,
  listingStatus,
  locationQuality,
  mediaKind,
  mediaStatus,
  migrationBatchStatus,
  migrationRecordStatus,
  moderationStatus,
  negotiationStatus,
  notificationChannel,
  notificationChannels,
  notificationPriority,
  notificationStatus,
  otpChannel,
  otpStatus,
  ownerStatus,
  platformRole,
  profileStatus,
  providerCapability,
  providerOperationStatus,
  quietHours,
  rateLimitScope,
  roleAssignmentStatus,
  roleScope,
  scanStatus,
  servicePricingUnit,
  serviceProviderStatus,
  serviceRequestStatus,
  smsPurpose,
  smsStatus,
  userType,
  verificationStatus,
} from "./validators";

export default defineSchema(
  {
    ...authTables,

    userProfiles: defineTable({
      authUserId: v.optional(v.id("users")),
      authSubject: v.optional(v.string()),
      legacyUserId: v.optional(v.string()),
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      primaryRole: platformRole,
      userType: v.optional(userType),
      city: v.optional(v.string()),
      monthlyBudget: v.optional(v.number()),
      acceptsRoommate: v.optional(v.boolean()),
      status: profileStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_auth_user", ["authUserId"])
      .index("by_auth_subject", ["authSubject"])
      .index("by_legacy_user", ["legacyUserId"])
      .index("by_phone", ["phone"])
      .index("by_email", ["email"])
      .index("by_primary_role", ["primaryRole"])
      .index("by_status", ["status"]),

    ownerProfiles: defineTable({
      userId: v.id("userProfiles"),
      legacyOwnerId: v.optional(v.string()),
      fullName: v.string(),
      phone: v.string(),
      ministryPropertyNumber: v.optional(v.string()),
      verificationStatus,
      status: ownerStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_legacy_owner", ["legacyOwnerId"])
      .index("by_phone", ["phone"])
      .index("by_verification_status", ["verificationStatus"])
      .index("by_status", ["status"]),

    serviceProviderProfiles: defineTable({
      userId: v.id("userProfiles"),
      businessName: v.string(),
      contactName: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      serviceCategories: v.array(v.string()),
      primaryCity: v.optional(v.string()),
      citiesServed: v.array(v.string()),
      verificationStatus,
      status: serviceProviderStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_verification_status", ["verificationStatus"])
      .index("by_primary_city_status", ["primaryCity", "status"]),

    roleAssignments: defineTable({
      userId: v.id("userProfiles"),
      role: platformRole,
      scope: roleScope,
      ownerProfileId: v.optional(v.id("ownerProfiles")),
      propertyId: v.optional(v.id("properties")),
      serviceProviderProfileId: v.optional(v.id("serviceProviderProfiles")),
      serviceOfferingId: v.optional(v.id("serviceOfferings")),
      status: roleAssignmentStatus,
      grantedByUserId: v.optional(v.id("userProfiles")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_role", ["userId", "role"])
      .index("by_owner_profile", ["ownerProfileId"])
      .index("by_property", ["propertyId"])
      .index("by_service_provider_profile", ["serviceProviderProfileId"])
      .index("by_service_offering", ["serviceOfferingId"])
      .index("by_status", ["status"]),

    properties: defineTable({
      ownerProfileId: v.id("ownerProfiles"),
      legacyPropertyId: v.optional(v.string()),
      title: v.string(),
      propertyLicenseNumber: v.string(),
      city: v.string(),
      neighborhood: v.string(),
      address: v.string(),
      universityNearby: v.string(),
      googleMapsUrl: v.optional(v.string()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      geohash: v.optional(v.string()),
      locationQuality,
      classification: v.string(),
      propertyType: v.string(),
      minRooms: v.number(),
      maxRooms: v.number(),
      floorsCount: v.number(),
      hasElevator: v.boolean(),
      hasCleaningWorker: v.boolean(),
      hasTransportService: v.boolean(),
      universityBusPasses: v.boolean(),
      bathrooms: v.number(),
      furnished: v.boolean(),
      maxResidents: v.number(),
      roommateAllowed: v.boolean(),
      requiresLeaseContract: v.boolean(),
      price: v.number(),
      paymentType: v.string(),
      negotiable: v.boolean(),
      allowWhatsappContact: v.boolean(),
      deposit: v.optional(v.number()),
      priceNotes: v.optional(v.string()),
      status: listingStatus,
      moderationStatus,
      searchText: v.string(),
      distanceText: v.optional(v.string()),
      timeText: v.optional(v.string()),
      publishedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_owner_status", ["ownerProfileId", "status"])
      .index("by_status_city", ["status", "city"])
      .index("by_status_city_price", ["status", "city", "price"])
      .index("by_status_city_published", ["status", "city", "publishedAt"])
      .index("by_moderation_status", ["moderationStatus"])
      .index("by_legacy_property", ["legacyPropertyId"])
      .index("by_geohash_status", ["geohash", "status"])
      .searchIndex("search_properties", {
        searchField: "searchText",
        filterFields: ["status", "city", "classification"],
      }),

    propertyServices: defineTable({
      propertyId: v.id("properties"),
      legacyServiceId: v.optional(v.string()),
      type: v.string(),
      name: v.string(),
      distanceValue: v.number(),
      distanceUnit,
      sortOrder: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_property", ["propertyId"]),

    propertyMedia: defineTable({
      propertyId: v.id("properties"),
      storageId: v.optional(v.id("_storage")),
      legacyUrl: v.optional(v.string()),
      kind: mediaKind,
      mimeType: v.optional(v.string()),
      byteSize: v.optional(v.number()),
      checksum: v.optional(v.string()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      durationSeconds: v.optional(v.number()),
      thumbnailStorageId: v.optional(v.id("_storage")),
      status: mediaStatus,
      scanStatus,
      sortOrder: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_property", ["propertyId"])
      .index("by_status", ["status"])
      .index("by_storage", ["storageId"])
      .index("by_checksum", ["checksum"]),

    serviceOfferings: defineTable({
      serviceProviderProfileId: v.id("serviceProviderProfiles"),
      category: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      city: v.string(),
      neighborhoods: v.optional(v.array(v.string())),
      basePrice: v.optional(v.number()),
      pricingUnit: servicePricingUnit,
      status: listingStatus,
      moderationStatus,
      searchText: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_provider_status", ["serviceProviderProfileId", "status"])
      .index("by_status_city_category", ["status", "city", "category"])
      .index("by_moderation_status", ["moderationStatus"])
      .index("by_city_category", ["city", "category"])
      .searchIndex("search_offerings", {
        searchField: "searchText",
        filterFields: ["status", "city", "category"],
      }),

    serviceRequests: defineTable({
      requesterUserId: v.id("userProfiles"),
      serviceProviderProfileId: v.optional(v.id("serviceProviderProfiles")),
      serviceOfferingId: v.optional(v.id("serviceOfferings")),
      propertyId: v.optional(v.id("properties")),
      category: v.string(),
      city: v.string(),
      details: v.optional(v.string()),
      status: serviceRequestStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
      closedAt: v.optional(v.number()),
    })
      .index("by_requester_status", ["requesterUserId", "status"])
      .index("by_provider_status", ["serviceProviderProfileId", "status"])
      .index("by_offering_created", ["serviceOfferingId", "createdAt"])
      .index("by_property_created", ["propertyId", "createdAt"])
      .index("by_city_category_status", ["city", "category", "status"]),

    favorites: defineTable({
      userId: v.id("userProfiles"),
      propertyId: v.id("properties"),
      city: v.string(),
      legacyFavoriteId: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_property", ["userId", "propertyId"])
      .index("by_property", ["propertyId"])
      .index("by_city_created", ["city", "createdAt"]),

    interests: defineTable({
      userId: v.id("userProfiles"),
      propertyId: v.id("properties"),
      mode: interestMode,
      legacyInterestId: v.optional(v.string()),
      status: interestStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_property_status", ["propertyId", "status"])
      .index("by_user_created", ["userId", "createdAt"])
      .index("by_property_created", ["propertyId", "createdAt"])
      .index("by_legacy_interest", ["legacyInterestId"]),

    roommatePreferences: defineTable({
      userId: v.id("userProfiles"),
      propertyId: v.id("properties"),
      roomsWanted: v.number(),
      acceptsSharedContract: v.boolean(),
      legacyPreferenceId: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user_property", ["userId", "propertyId"])
      .index("by_property", ["propertyId"])
      .index("by_legacy_preference", ["legacyPreferenceId"]),

    roommateRequests: defineTable({
      propertyId: v.id("properties"),
      userId: v.id("userProfiles"),
      userType,
      age: v.number(),
      organization: v.string(),
      major: v.optional(v.string()),
      moveInDate: v.string(),
      bio: v.string(),
      availableRooms: v.number(),
      legacyRequestId: v.optional(v.string()),
      status: v.union(
        v.literal("open"),
        v.literal("matched"),
        v.literal("closed"),
        v.literal("hidden"),
      ),
      moderationStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_property_status", ["propertyId", "status"])
      .index("by_user_status", ["userId", "status"])
      .index("by_status_created", ["status", "createdAt"])
      .index("by_moderation_status", ["moderationStatus"])
      .index("by_legacy_request", ["legacyRequestId"]),

    negotiationSignals: defineTable({
      userId: v.id("userProfiles"),
      propertyId: v.id("properties"),
      suggestedPrice: v.number(),
      reason: v.string(),
      legacyNegotiationId: v.optional(v.string()),
      status: negotiationStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_property_status", ["propertyId", "status"])
      .index("by_user_created", ["userId", "createdAt"])
      .index("by_legacy_negotiation", ["legacyNegotiationId"]),

    geocodeCache: defineTable({
      provider: v.string(),
      requestHash: v.string(),
      query: v.string(),
      lat: v.number(),
      lng: v.number(),
      formattedAddress: v.optional(v.string()),
      quality: locationQuality,
      expiresAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_provider_request_hash", ["provider", "requestHash"])
      .index("by_expires_at", ["expiresAt"]),

    placeCache: defineTable({
      provider: v.string(),
      requestHash: v.string(),
      query: v.string(),
      results: v.array(v.any()),
      expiresAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_provider_request_hash", ["provider", "requestHash"])
      .index("by_expires_at", ["expiresAt"]),

    routeCache: defineTable({
      provider: v.string(),
      requestHash: v.string(),
      originLat: v.number(),
      originLng: v.number(),
      destinationLat: v.number(),
      destinationLng: v.number(),
      distanceMeters: v.number(),
      durationSeconds: v.number(),
      routeSummary: v.optional(v.string()),
      expiresAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_provider_request_hash", ["provider", "requestHash"])
      .index("by_expires_at", ["expiresAt"]),

    mapProviderHealth: defineTable({
      provider: v.string(),
      operation: v.string(),
      status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("unavailable")),
      quotaStatus: v.union(
        v.literal("ok"),
        v.literal("near_limit"),
        v.literal("limited"),
        v.literal("unknown"),
      ),
      responseTimeMs: v.number(),
      failureCount: v.number(),
      circuitOpenUntil: v.optional(v.number()),
      lastSuccessAt: v.optional(v.number()),
      lastFailureAt: v.optional(v.number()),
      checkedAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_provider_operation", ["provider", "operation"])
      .index("by_status_updated", ["status", "updatedAt"])
      .index("by_circuit_open_until", ["circuitOpenUntil"]),

    smsProviderHealth: defineTable({
      provider: v.string(),
      operation: v.string(),
      status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("unavailable")),
      responseTimeMs: v.number(),
      failureRate: v.number(),
      deliverySuccessRate: v.number(),
      sampleCount: v.number(),
      successCount: v.number(),
      failureCount: v.number(),
      deliveryAttemptCount: v.number(),
      deliverySuccessCount: v.number(),
      circuitOpenUntil: v.optional(v.number()),
      lastSuccessAt: v.optional(v.number()),
      lastFailureAt: v.optional(v.number()),
      checkedAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_provider_operation", ["provider", "operation"])
      .index("by_status_updated", ["status", "updatedAt"])
      .index("by_circuit_open_until", ["circuitOpenUntil"]),

    notificationPreferences: defineTable({
      userId: v.id("userProfiles"),
      channels: notificationChannels,
      eventTypes: v.optional(v.record(v.string(), v.boolean())),
      quietHours: v.optional(quietHours),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    notifications: defineTable({
      userId: v.id("userProfiles"),
      relatedPropertyId: v.optional(v.id("properties")),
      relatedOwnerProfileId: v.optional(v.id("ownerProfiles")),
      relatedServiceProviderProfileId: v.optional(v.id("serviceProviderProfiles")),
      relatedServiceRequestId: v.optional(v.id("serviceRequests")),
      type: v.string(),
      title: v.string(),
      body: v.string(),
      data: v.optional(v.any()),
      status: notificationStatus,
      priority: notificationPriority,
      createdAt: v.number(),
      readAt: v.optional(v.number()),
    })
      .index("by_user_status_created", ["userId", "status", "createdAt"])
      .index("by_property_created", ["relatedPropertyId", "createdAt"])
      .index("by_owner_profile_created", ["relatedOwnerProfileId", "createdAt"])
      .index("by_service_provider_created", ["relatedServiceProviderProfileId", "createdAt"])
      .index("by_service_request_created", ["relatedServiceRequestId", "createdAt"])
      .index("by_type_created", ["type", "createdAt"]),

    notificationDeliveries: defineTable({
      notificationId: v.id("notifications"),
      userId: v.id("userProfiles"),
      channel: notificationChannel,
      provider: v.optional(v.string()),
      status: deliveryStatus,
      attemptCount: v.number(),
      lastError: v.optional(v.string()),
      providerMessageId: v.optional(v.string()),
      nextAttemptAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_notification", ["notificationId"])
      .index("by_status_next_attempt", ["status", "nextAttemptAt"])
      .index("by_user_channel", ["userId", "channel"])
      .index("by_provider_message", ["provider", "providerMessageId"]),

    jobs: defineTable({
      type: v.string(),
      payload: v.any(),
      status: jobStatus,
      idempotencyKey: v.string(),
      attemptCount: v.number(),
      runAt: v.number(),
      lockedAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_status_run_at", ["status", "runAt"])
      .index("by_idempotency_key", ["idempotencyKey"])
      .index("by_type_status", ["type", "status"]),

    otpChallenges: defineTable({
      userId: v.optional(v.id("userProfiles")),
      channel: otpChannel,
      destinationHash: v.string(),
      codeHash: v.string(),
      status: otpStatus,
      attemptCount: v.number(),
      expiresAt: v.number(),
      createdAt: v.number(),
      verifiedAt: v.optional(v.number()),
    })
      .index("by_destination_status", ["destinationHash", "status"])
      .index("by_expires_at", ["expiresAt"])
      .index("by_user_status", ["userId", "status"]),

    smsMessages: defineTable({
      provider: v.string(),
      userId: v.optional(v.id("userProfiles")),
      challengeId: v.optional(v.id("otpChallenges")),
      purpose: smsPurpose,
      toHash: v.string(),
      bodyTemplate: v.string(),
      status: smsStatus,
      providerMessageId: v.optional(v.string()),
      costEstimate: v.optional(v.number()),
      currency: v.optional(v.string()),
      idempotencyKey: v.string(),
      attemptCount: v.number(),
      lastError: v.optional(v.string()),
      nextAttemptAt: v.optional(v.number()),
      expiresAt: v.optional(v.number()),
      deliveredAt: v.optional(v.number()),
      failedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_status_created", ["status", "createdAt"])
      .index("by_status_next_attempt", ["status", "nextAttemptAt"])
      .index("by_provider_message", ["provider", "providerMessageId"])
      .index("by_idempotency_key", ["idempotencyKey"])
      .index("by_to_created", ["toHash", "createdAt"])
      .index("by_expires_at", ["expiresAt"])
      .index("by_created", ["createdAt"]),

    rateLimits: defineTable({
      scope: rateLimitScope,
      keyHash: v.string(),
      action: v.string(),
      windowStart: v.number(),
      count: v.number(),
      blockedUntil: v.optional(v.number()),
      updatedAt: v.number(),
    })
      .index("by_scope_key_action_window", ["scope", "keyHash", "action", "windowStart"])
      .index("by_blocked_until", ["blockedUntil"])
      .index("by_action", ["action"]),

    providerUsageEvents: defineTable({
      provider: v.string(),
      capability: providerCapability,
      operation: v.string(),
      relatedUserId: v.optional(v.id("userProfiles")),
      relatedOwnerProfileId: v.optional(v.id("ownerProfiles")),
      relatedPropertyId: v.optional(v.id("properties")),
      relatedServiceProviderProfileId: v.optional(v.id("serviceProviderProfiles")),
      relatedServiceOfferingId: v.optional(v.id("serviceOfferings")),
      unitCount: v.number(),
      estimatedCost: v.optional(v.number()),
      currency: v.optional(v.string()),
      status: providerOperationStatus,
      metadata: v.optional(v.any()),
      createdAt: v.number(),
    })
      .index("by_provider_created", ["provider", "createdAt"])
      .index("by_capability_created", ["capability", "createdAt"])
      .index("by_operation_created", ["operation", "createdAt"])
      .index("by_property_created", ["relatedPropertyId", "createdAt"])
      .index("by_owner_profile_created", ["relatedOwnerProfileId", "createdAt"])
      .index("by_service_provider_created", ["relatedServiceProviderProfileId", "createdAt"])
      .index("by_service_offering_created", ["relatedServiceOfferingId", "createdAt"]),

    costSnapshots: defineTable({
      periodStart: v.number(),
      periodEnd: v.number(),
      capability: v.string(),
      provider: v.string(),
      unitCount: v.number(),
      estimatedCost: v.number(),
      currency: v.string(),
      createdAt: v.number(),
    })
      .index("by_period", ["periodStart", "periodEnd"])
      .index("by_provider_period", ["provider", "periodStart"])
      .index("by_capability_period", ["capability", "periodStart"]),

    auditEvents: defineTable({
      actorUserId: v.optional(v.id("userProfiles")),
      actorType,
      action: v.string(),
      targetTable: v.optional(v.string()),
      targetId: v.optional(v.string()),
      metadata: v.optional(v.any()),
      ipHash: v.optional(v.string()),
      userAgentHash: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_actor_created", ["actorUserId", "createdAt"])
      .index("by_action_created", ["action", "createdAt"])
      .index("by_target", ["targetTable", "targetId"])
      .index("by_created", ["createdAt"]),

    featureFlagOverrides: defineTable({
      scope: featureFlagScope,
      userId: v.optional(v.id("userProfiles")),
      ownerProfileId: v.optional(v.id("ownerProfiles")),
      propertyId: v.optional(v.id("properties")),
      serviceProviderProfileId: v.optional(v.id("serviceProviderProfiles")),
      key: v.string(),
      value: v.any(),
      reason: v.optional(v.string()),
      createdByUserId: v.optional(v.id("userProfiles")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_key", ["key"])
      .index("by_scope_user", ["scope", "userId"])
      .index("by_scope_owner_profile", ["scope", "ownerProfileId"])
      .index("by_scope_property", ["scope", "propertyId"])
      .index("by_scope_service_provider_profile", ["scope", "serviceProviderProfileId"]),

    migrationBatches: defineTable({
      schemaVersion: v.number(),
      source: v.string(),
      sourceChecksum: v.string(),
      status: migrationBatchStatus,
      operatorUserId: v.optional(v.id("userProfiles")),
      summary: v.optional(v.any()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_status_created", ["status", "createdAt"])
      .index("by_source_checksum", ["source", "sourceChecksum"])
      .index("by_operator_created", ["operatorUserId", "createdAt"]),

    migrationRecords: defineTable({
      batchId: v.id("migrationBatches"),
      schemaVersion: v.number(),
      sourceKey: v.string(),
      legacyId: v.optional(v.string()),
      idempotencyKey: v.string(),
      targetTable: v.optional(v.string()),
      targetId: v.optional(v.string()),
      checksum: v.optional(v.string()),
      status: migrationRecordStatus,
      errors: v.optional(v.array(v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_batch", ["batchId"])
      .index("by_idempotency_key", ["idempotencyKey"])
      .index("by_target", ["targetTable", "targetId"])
      .index("by_status", ["status"]),
  },
  {
    schemaValidation: true,
    strictTableNameTypes: true,
  },
);
