import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  actorType,
  deliveryStatus,
  distanceUnit,
  featureFlagScope,
  identityProviderLinkStatus,
  identitySessionStatus,
  identityStatus,
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
  bookingStatus,
  paymentEntityType,
  paymentStatus,
  platformRole,
  profileStatus,
  providerCapability,
  providerOperationStatus,
  publicationStatus,
  propertyWorkflowStatus,
  quietHours,
  rateLimitScope,
  roleAssignmentStatus,
  roleScope,
  roommateCardWorkflowStatus,
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

    publicIdCounters: defineTable({
      key: v.string(),
      value: v.number(),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

    universities: defineTable({
      externalId: v.string(),
      name: v.string(),
      region: v.optional(v.string()),
      city: v.string(),
      active: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_external_id", ["externalId"])
      .index("by_active", ["active"])
      .index("by_city_and_active", ["city", "active"]),

    universityBranches: defineTable({
      universityId: v.id("universities"),
      externalId: v.string(),
      name: v.string(),
      region: v.optional(v.string()),
      city: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      active: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_external_id", ["externalId"])
      .index("by_university_id_and_active", ["universityId", "active"])
      .index("by_city_and_active", ["city", "active"])
      .index("by_active", ["active"]),

    userProfiles: defineTable({
      authUserId: v.optional(v.id("users")),
      authSubject: v.optional(v.string()),
      identityKey: v.optional(v.string()),
      legacyUserId: v.optional(v.string()),
      publicCode: v.optional(v.string()),
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      primaryRole: platformRole,
      userType: v.optional(userType),
      city: v.optional(v.string()),
      district: v.optional(v.string()),
      monthlyBudget: v.optional(v.number()),
      acceptsRoommate: v.optional(v.boolean()),
      roommatePreferences: v.optional(
        v.object({
          smoking: v.union(v.literal("yes"), v.literal("no")),
          guests: v.union(
            v.literal("never"),
            v.literal("occasionally"),
            v.literal("frequently"),
            v.literal("no_preference"),
          ),
          sleep: v.union(v.literal("early"), v.literal("flexible"), v.literal("late")),
          cleanliness: v.union(
            v.literal("very_tidy"),
            v.literal("average"),
            v.literal("no_preference"),
          ),
          pets: v.union(v.literal("allowed"), v.literal("not_allowed")),
          cooking: v.union(v.literal("frequently"), v.literal("occasionally"), v.literal("rarely")),
          occupation: v.union(v.literal("student"), v.literal("employee"), v.literal("both")),
          noise: v.union(v.literal("quiet"), v.literal("moderate"), v.literal("no_preference")),
        }),
      ),
      selectedUniversityBranchId: v.optional(v.id("universityBranches")),
      status: profileStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_auth_user", ["authUserId"])
      .index("by_auth_subject", ["authSubject"])
      .index("by_identity_key", ["identityKey"])
      .index("by_legacy_user", ["legacyUserId"])
      .index("by_public_code", ["publicCode"])
      .index("by_phone", ["phone"])
      .index("by_email", ["email"])
      .index("by_primary_role", ["primaryRole"])
      .index("by_status", ["status"]),

    identities: defineTable({
      identityKey: v.string(),
      userProfileId: v.id("userProfiles"),
      status: identityStatus,
      createdAt: v.number(),
      updatedAt: v.number(),
      revokedAt: v.optional(v.number()),
    })
      .index("by_identity_key", ["identityKey"])
      .index("by_user_profile", ["userProfileId"])
      .index("by_status", ["status"]),

    identityProviderLinks: defineTable({
      identityId: v.id("identities"),
      providerKey: v.string(),
      providerSubjectHash: v.string(),
      status: identityProviderLinkStatus,
      verifiedAt: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      revokedAt: v.optional(v.number()),
    })
      .index("by_provider_and_subject_hash", ["providerKey", "providerSubjectHash"])
      .index("by_identity_and_provider", ["identityId", "providerKey"])
      .index("by_identity_and_status", ["identityId", "status"]),

    identitySessions: defineTable({
      identityId: v.id("identities"),
      tokenHash: v.string(),
      status: identitySessionStatus,
      expiresAt: v.number(),
      refreshExpiresAt: v.number(),
      lastValidatedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      revokedAt: v.optional(v.number()),
      replacedBySessionId: v.optional(v.id("identitySessions")),
    })
      .index("by_token_hash", ["tokenHash"])
      .index("by_identity_and_status", ["identityId", "status"])
      .index("by_status_and_expires_at", ["status", "expiresAt"])
      .index("by_status_and_refresh_expires_at", ["status", "refreshExpiresAt"]),

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
      region: v.optional(v.string()),
      city: v.string(),
      neighborhood: v.string(),
      district: v.optional(v.string()),
      landmark: v.optional(v.string()),
      address: v.string(),
      universityNearby: v.string(),
      googleMapsUrl: v.optional(v.string()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      locationVisibility: v.optional(
        v.union(v.literal("exact"), v.literal("approximate"), v.literal("private")),
      ),
      geohash: v.optional(v.string()),
      locationQuality,
      classification: v.string(),
      propertyType: v.string(),
      minRooms: v.number(),
      maxRooms: v.number(),
      floorsCount: v.number(),
      hasElevator: v.boolean(),
      hasCleaningWorker: v.boolean(),
      features: v.optional(
        v.array(
          v.union(
            v.literal("cleaning_worker"),
            v.literal("security_cameras"),
            v.literal("elevator"),
            v.literal("self_check_in"),
          ),
        ),
      ),
      facilities: v.optional(
        v.array(
          v.union(
            v.literal("mosque"),
            v.literal("grocery"),
            v.literal("supermarket"),
            v.literal("malls"),
            v.literal("food_supply"),
            v.literal("mall"),
            v.literal("salon"),
            v.literal("bus_station"),
            v.literal("train_station"),
            v.literal("pharmacy"),
            v.literal("clinics"),
          ),
        ),
      ),
      rentIncludes: v.optional(
        v.array(v.union(v.literal("electricity"), v.literal("water"), v.literal("internet"))),
      ),
      hasTransportService: v.boolean(),
      universityBusPasses: v.boolean(),
      bathrooms: v.number(),
      furnished: v.boolean(),
      maxResidents: v.number(),
      totalUnits: v.optional(v.number()),
      availableUnits: v.optional(v.number()),
      availabilityStatus: v.optional(
        v.union(v.literal("available"), v.literal("nearly_full"), v.literal("full")),
      ),
      roommateAllowed: v.boolean(),
      requiresLeaseContract: v.boolean(),
      price: v.number(),
      paymentType: v.string(),
      rentalPrices: v.optional(
        v.object({
          daily: v.optional(v.number()),
          weekly: v.optional(v.number()),
          monthly: v.optional(v.number()),
          yearly: v.optional(v.number()),
        }),
      ),
      negotiable: v.boolean(),
      allowWhatsappContact: v.boolean(),
      deposit: v.optional(v.number()),
      priceNotes: v.optional(v.string()),
      status: listingStatus,
      publicationStatus: v.optional(publicationStatus),
      moderationStatus,
      rejectionReason: v.optional(v.string()),
      submittedAt: v.optional(v.number()),
      reviewedAt: v.optional(v.number()),
      reviewedByUserId: v.optional(v.id("userProfiles")),
      paymentCompleted: v.optional(v.boolean()),
      workflowStatus: v.optional(propertyWorkflowStatus),
      paymentStatus: v.optional(paymentStatus),
      contentVersion: v.optional(v.number()),
      reviewedContentVersion: v.optional(v.number()),
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
      .index("by_publication_status", ["publicationStatus"])
      .index("by_workflow_status", ["workflowStatus"])
      .index("by_owner_and_workflow_status", ["ownerProfileId", "workflowStatus"])
      .index("by_legacy_property", ["legacyPropertyId"])
      .index("by_geohash_status", ["geohash", "status"])
      .searchIndex("search_properties", {
        searchField: "searchText",
        filterFields: ["status", "city", "classification"],
      }),

    propertyServices: defineTable({
      propertyId: v.optional(v.id("properties")),
      linkedPropertyId: v.optional(v.id("properties")),
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
      propertyId: v.optional(v.id("properties")),
      uploaderUserId: v.optional(v.id("userProfiles")),
      provider: v.optional(v.string()),
      storageId: v.optional(v.id("_storage")),
      legacyUrl: v.optional(v.string()),
      kind: mediaKind,
      originalFileName: v.optional(v.string()),
      mimeType: v.optional(v.string()),
      byteSize: v.optional(v.number()),
      checksum: v.optional(v.string()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      durationSeconds: v.optional(v.number()),
      thumbnailStorageId: v.optional(v.id("_storage")),
      thumbnailMimeType: v.optional(v.string()),
      thumbnailByteSize: v.optional(v.number()),
      isCover: v.optional(v.boolean()),
      status: mediaStatus,
      scanStatus,
      uploadExpiresAt: v.optional(v.number()),
      retryCount: v.optional(v.number()),
      lastError: v.optional(v.string()),
      sortOrder: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_property", ["propertyId"])
      .index("by_property_and_cover", ["propertyId", "isCover"])
      .index("by_uploader_and_status", ["uploaderUserId", "status"])
      .index("by_status", ["status"])
      .index("by_status_and_upload_expires_at", ["status", "uploadExpiresAt"])
      .index("by_status_and_updated_at", ["status", "updatedAt"])
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
      // Deprecated propertyId remains during migration; new cards use linkedPropertyId.
      propertyId: v.optional(v.id("properties")),
      linkedPropertyId: v.optional(v.id("properties")),
      userId: v.id("userProfiles"),
      userType,
      age: v.number(),
      organization: v.string(),
      major: v.optional(v.string()),
      moveInDate: v.string(),
      bio: v.string(),
      availableRooms: v.number(),
      source: v.optional(v.union(v.literal("saknaha_property"), v.literal("external_property"))),
      pricePerPerson: v.optional(v.number()),
      preferences: v.optional(
        v.object({
          smoking: v.union(v.literal("yes"), v.literal("no")),
          guests: v.union(
            v.literal("never"),
            v.literal("occasionally"),
            v.literal("frequently"),
            v.literal("no_preference"),
          ),
          sleep: v.union(v.literal("early"), v.literal("flexible"), v.literal("late")),
          cleanliness: v.union(
            v.literal("very_tidy"),
            v.literal("average"),
            v.literal("no_preference"),
          ),
          pets: v.union(v.literal("allowed"), v.literal("not_allowed")),
          cooking: v.union(v.literal("frequently"), v.literal("occasionally"), v.literal("rarely")),
          occupation: v.union(v.literal("student"), v.literal("employee"), v.literal("both")),
          noise: v.union(v.literal("quiet"), v.literal("moderate"), v.literal("no_preference")),
        }),
      ),
      region: v.optional(v.string()),
      city: v.optional(v.string()),
      district: v.optional(v.string()),
      landmark: v.optional(v.string()),
      universityBranchId: v.optional(v.id("universityBranches")),
      approximateLat: v.optional(v.number()),
      approximateLng: v.optional(v.number()),
      externalHousing: v.optional(
        v.object({
          city: v.string(),
          district: v.string(),
          approximateLocation: v.optional(v.string()),
          nearbyLandmarks: v.optional(v.array(v.string())),
          approximateLat: v.optional(v.number()),
          approximateLng: v.optional(v.number()),
        }),
      ),
      workflowStatus: v.optional(roommateCardWorkflowStatus),
      paymentStatus: v.optional(paymentStatus),
      publicationStatus: v.optional(publicationStatus),
      rejectionReason: v.optional(v.string()),
      submittedAt: v.optional(v.number()),
      reviewedAt: v.optional(v.number()),
      reviewedByUserId: v.optional(v.id("userProfiles")),
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
      .index("by_publication_status", ["publicationStatus"])
      .index("by_workflow_status", ["workflowStatus"])
      .index("by_user_and_workflow_status", ["userId", "workflowStatus"])
      .index("by_linked_property", ["linkedPropertyId"])
      .index("by_legacy_request", ["legacyRequestId"]),

    roommateInterests: defineTable({
      requesterUserId: v.id("userProfiles"),
      roommateRequestId: v.id("roommateRequests"),
      status: v.union(v.literal("registered"), v.literal("withdrawn")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_requester_and_request", ["requesterUserId", "roommateRequestId"])
      .index("by_request_and_status", ["roommateRequestId", "status"])
      .index("by_requester_and_status", ["requesterUserId", "status"]),

    bookings: defineTable({
      propertyId: v.id("properties"),
      requesterUserId: v.id("userProfiles"),
      ownerProfileId: v.id("ownerProfiles"),
      status: bookingStatus,
      startDate: v.string(),
      endDate: v.optional(v.string()),
      pricingPeriod: v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("term"),
        v.literal("academic_year"),
        v.literal("yearly"),
      ),
      amount: v.number(),
      currency: v.string(),
      note: v.optional(v.string()),
      ownerReason: v.optional(v.string()),
      paymentStatus: paymentStatus,
      confirmedAt: v.optional(v.number()),
      cancelledAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_requester_and_status", ["requesterUserId", "status"])
      .index("by_requester_and_property_and_status", ["requesterUserId", "propertyId", "status"])
      .index("by_owner_and_status", ["ownerProfileId", "status"])
      .index("by_property_and_status", ["propertyId", "status"])
      .index("by_status_and_created", ["status", "createdAt"]),

    payments: defineTable({
      userId: v.id("userProfiles"),
      entityType: paymentEntityType,
      propertyId: v.optional(v.id("properties")),
      roommateRequestId: v.optional(v.id("roommateRequests")),
      bookingId: v.optional(v.id("bookings")),
      provider: v.string(),
      providerReference: v.optional(v.string()),
      idempotencyKey: v.string(),
      amount: v.number(),
      currency: v.string(),
      status: paymentStatus,
      verifiedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_idempotency_key", ["idempotencyKey"])
      .index("by_provider_reference", ["provider", "providerReference"])
      .index("by_property_and_status", ["propertyId", "status"])
      .index("by_roommate_request_and_status", ["roommateRequestId", "status"])
      .index("by_booking_and_status", ["bookingId", "status"])
      .index("by_user_and_status", ["userId", "status"]),

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
      idempotencyKey: v.optional(v.string()),
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
      .index("by_idempotency_key", ["idempotencyKey"])
      .index("by_user_created", ["userId", "createdAt"])
      .index("by_user_status_created", ["userId", "status", "createdAt"])
      .index("by_property_created", ["relatedPropertyId", "createdAt"])
      .index("by_owner_profile_created", ["relatedOwnerProfileId", "createdAt"])
      .index("by_service_provider_created", ["relatedServiceProviderProfileId", "createdAt"])
      .index("by_service_request_created", ["relatedServiceRequestId", "createdAt"])
      .index("by_type_created", ["type", "createdAt"]),

    notificationDeliveries: defineTable({
      notificationId: v.id("notifications"),
      userId: v.id("userProfiles"),
      idempotencyKey: v.optional(v.string()),
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
      .index("by_idempotency_key", ["idempotencyKey"])
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

    usageAnalyticsEvents: defineTable({
      userId: v.id("userProfiles"),
      name: v.string(),
      route: v.optional(v.string()),
      properties: v.optional(
        v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
      ),
      environment: v.string(),
      createdAt: v.number(),
    })
      .index("by_created", ["createdAt"])
      .index("by_name_and_created", ["name", "createdAt"])
      .index("by_user_and_created", ["userId", "createdAt"])
      .index("by_route_and_created", ["route", "createdAt"]),

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
      adminId: v.optional(v.id("userProfiles")),
      actorType,
      action: v.string(),
      entity: v.optional(v.string()),
      targetTable: v.optional(v.string()),
      targetId: v.optional(v.string()),
      entityType: v.optional(v.string()),
      entityId: v.optional(v.string()),
      timestamp: v.optional(v.number()),
      reason: v.optional(v.string()),
      previousValue: v.optional(v.any()),
      newValue: v.optional(v.any()),
      metadata: v.optional(v.any()),
      ipHash: v.optional(v.string()),
      userAgentHash: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_actor_created", ["actorUserId", "createdAt"])
      .index("by_action_created", ["action", "createdAt"])
      .index("by_target", ["targetTable", "targetId"])
      .index("by_entity", ["entityType", "entityId"])
      .index("by_created", ["createdAt"]),

    bootstrapRuns: defineTable({
      key: v.string(),
      completedByUserId: v.id("userProfiles"),
      completedAt: v.number(),
      metadata: v.optional(v.any()),
    }).index("by_key", ["key"]),

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
