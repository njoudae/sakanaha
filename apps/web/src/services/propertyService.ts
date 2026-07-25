import type {
  DistanceUnit,
  FavoriteProperty,
  Interest,
  NegotiationSignal,
  Property,
  PropertyView,
  RoommateJoinRequest,
  PropertyStatus,
  RoommatePreference,
  RoommateRequest,
  RoommateRequestView,
  ServiceNearby,
} from "@saknaha/shared-types";
import { makeId, readStorage, writeStorage } from "./storage";
import { normalizeRentalPrices } from "@saknaha/utils/propertyFormat";
import {
  getAvailabilityStatus,
  getAvailableUnits,
  getTotalUnits,
  withNormalizedInventory,
} from "./propertyAvailability";
import { getPropertyFeatures } from "./propertyAmenities";

const PROPERTY_KEY = "saknaha.properties";
const INTEREST_KEY = "saknaha.interests";
const FAVORITE_KEY = "saknaha.favorites";
const ROOMMATE_KEY = "saknaha.roommates";
const ROOMMATE_REQUEST_KEY = "saknaha.roommateRequests";
const NEGOTIATION_KEY = "saknaha.negotiations";
const PROPERTY_VIEW_KEY = "saknaha.propertyViews";
const ROOMMATE_VIEW_KEY = "saknaha.roommateViews";
const ROOMMATE_JOIN_REQUEST_KEY = "saknaha.roommateJoinRequests";

function hasLegacyPropertyId(value: string | undefined) {
  return value?.startsWith("mock-") === true;
}

function cleanupLegacyDemoReferences() {
  const interests = readStorage<Interest[]>(INTEREST_KEY, []);
  const realInterests = interests.filter((item) => !hasLegacyPropertyId(item.propertyId));
  if (realInterests.length !== interests.length) writeStorage(INTEREST_KEY, realInterests);

  const favorites = readStorage<FavoriteProperty[]>(FAVORITE_KEY, []);
  const realFavorites = favorites.filter((item) => !hasLegacyPropertyId(item.propertyId));
  if (realFavorites.length !== favorites.length) writeStorage(FAVORITE_KEY, realFavorites);

  const preferences = readStorage<RoommatePreference[]>(ROOMMATE_KEY, []);
  const realPreferences = preferences.filter((item) => !hasLegacyPropertyId(item.propertyId));
  if (realPreferences.length !== preferences.length) writeStorage(ROOMMATE_KEY, realPreferences);

  const negotiations = readStorage<NegotiationSignal[]>(NEGOTIATION_KEY, []);
  const realNegotiations = negotiations.filter((item) => !hasLegacyPropertyId(item.propertyId));
  if (realNegotiations.length !== negotiations.length)
    writeStorage(NEGOTIATION_KEY, realNegotiations);

  const propertyViews = readStorage<PropertyView[]>(PROPERTY_VIEW_KEY, []);
  const realPropertyViews = propertyViews.filter((item) => !hasLegacyPropertyId(item.propertyId));
  if (realPropertyViews.length !== propertyViews.length) {
    writeStorage(PROPERTY_VIEW_KEY, realPropertyViews);
  }

  const roommateViews = readStorage<RoommateRequestView[]>(ROOMMATE_VIEW_KEY, []);
  const realRoommateViews = roommateViews.filter(
    (item) => !item.requestId.startsWith("demo-roommate-"),
  );
  if (realRoommateViews.length !== roommateViews.length) {
    writeStorage(ROOMMATE_VIEW_KEY, realRoommateViews);
  }

  const joinRequests = readStorage<RoommateJoinRequest[]>(ROOMMATE_JOIN_REQUEST_KEY, []);
  const realJoinRequests = joinRequests.filter(
    (item) => !hasLegacyPropertyId(item.propertyId) && !item.requestId.startsWith("demo-roommate-"),
  );
  if (realJoinRequests.length !== joinRequests.length) {
    writeStorage(ROOMMATE_JOIN_REQUEST_KEY, realJoinRequests);
  }
}

export function getProperties(): Property[] {
  cleanupLegacyDemoReferences();
  const saved = readStorage<Property[]>(PROPERTY_KEY, []);
  const realProperties = saved.filter(
    (property) => property.ownerId !== "mock-owner" && !property.id.startsWith("mock-"),
  );
  const normalized = realProperties.map(normalizeProperty);
  if (realProperties.length !== saved.length) writeStorage(PROPERTY_KEY, normalized);
  return normalized;
}

function normalizeProperty(property: Property & { rooms?: number }): Property {
  const roomCount = property.rooms ?? property.minRooms ?? 1;
  const normalized: Property = {
    ...property,
    region: property.region ?? "",
    district: property.district ?? property.neighborhood,
    publicationStatus:
      property.publicationStatus ??
      (property.status === "published"
        ? "approved"
        : property.status === "paused"
          ? "unpublished"
          : "draft"),
    propertyLicenseNumber: property.propertyLicenseNumber || "غير محدد",
    googleMapsUrl: property.googleMapsUrl || "",
    minRooms: property.minRooms ?? roomCount,
    maxRooms: property.maxRooms ?? roomCount,
    floorsCount: property.floorsCount ?? 1,
    hasElevator: property.hasElevator ?? false,
    hasCleaningWorker: property.hasCleaningWorker ?? false,
    features: getPropertyFeatures(property),
    facilities: property.facilities ?? [],
    rentIncludes: property.rentIncludes ?? [],
    hasTransportService: property.hasTransportService ?? false,
    universityBusPasses: property.universityBusPasses ?? false,
    requiresLeaseContract: property.requiresLeaseContract ?? property.roommateAllowed ?? true,
    allowWhatsappContact: property.allowWhatsappContact ?? property.negotiable ?? false,
    rentalPrices: normalizeRentalPrices(property),
    videos: property.videos ?? [],
    services: property.services.map(normalizeService),
  };
  return withNormalizedInventory(normalized);
}

function normalizeService(service: ServiceNearby & { distance?: string }): ServiceNearby {
  if (service.distanceValue && service.distanceUnit) return service;
  const rawDistance = service.distance ?? "";
  const parsedValue = Number(rawDistance.match(/\d+/)?.[0] ?? 1);
  const unit: DistanceUnit = rawDistance.includes("كيلو")
    ? "kilometer"
    : rawDistance.includes("سيارة")
      ? "driving_minutes"
      : rawDistance.includes("ساعة")
        ? "hour"
        : rawDistance.includes("متر")
          ? "meter"
          : "walking_minutes";
  return {
    id: service.id,
    type: service.type,
    name: service.name,
    distanceValue: parsedValue,
    distanceUnit: unit,
  };
}

export function getPublishedProperties(): Property[] {
  return getProperties().filter(
    (property) =>
      property.status === "published" && (property.publicationStatus ?? "approved") === "approved",
  );
}

export function getOwnerSubmittedPublishedProperties(): Property[] {
  return getPublishedProperties();
}

export function getPropertyById(id: string): Property | null {
  return getProperties().find((property) => property.id === id) ?? null;
}

export function getPublicPropertyById(id: string): Property | null {
  return getPublishedProperties().find((property) => property.id === id) ?? null;
}

export function getOwnerProperties(ownerId: string): Property[] {
  return getProperties().filter((property) => property.ownerId === ownerId);
}

export function getOwnerInterests(ownerId: string): Interest[] {
  const ownerPropertyIds = new Set(getOwnerProperties(ownerId).map((property) => property.id));
  return readStorage<Interest[]>(INTEREST_KEY, []).filter((interest) =>
    ownerPropertyIds.has(interest.propertyId),
  );
}

export function getUserInterests(userId: string): Interest[] {
  return readStorage<Interest[]>(INTEREST_KEY, []).filter((interest) => interest.userId === userId);
}

export function saveProperty(property: Property): Property {
  const properties = getProperties();
  const normalizedProperty = withNormalizedInventory(property);
  const nextProperty = normalizedProperty.id
    ? normalizedProperty
    : { ...normalizedProperty, id: makeId("property"), createdAt: new Date().toISOString() };
  const exists = properties.some((item) => item.id === nextProperty.id);
  const next = exists
    ? properties.map((item) => (item.id === nextProperty.id ? nextProperty : item))
    : [nextProperty, ...properties];
  writeStorage(PROPERTY_KEY, next);
  return nextProperty;
}

export function updatePropertyStatus(id: string, status: PropertyStatus): void {
  const next = getProperties().map((property) =>
    property.id === id
      ? {
          ...property,
          status,
          publicationStatus:
            status === "published"
              ? "approved"
              : status === "paused" || status === "unpublished"
                ? "unpublished"
                : property.publicationStatus,
        }
      : property,
  );
  writeStorage(PROPERTY_KEY, next);
}

export function moderateLocalProperty(
  id: string,
  publicationStatus: NonNullable<Property["publicationStatus"]>,
  rejectionReason?: string,
): void {
  const reviewedAt = new Date().toISOString();
  const next = getProperties().map((property) => {
    if (property.id !== id) return property;
    return {
      ...property,
      publicationStatus,
      rejectionReason: publicationStatus === "rejected" ? rejectionReason?.trim() : undefined,
      reviewedAt,
      status:
        publicationStatus === "approved"
          ? "published"
          : publicationStatus === "archived"
            ? "archived"
            : publicationStatus === "unpublished"
              ? "unpublished"
              : publicationStatus === "rejected"
                ? "rejected"
                : "draft",
    };
  });
  writeStorage(PROPERTY_KEY, next);
}

export function deleteLocalProperty(id: string): void {
  writeStorage(
    PROPERTY_KEY,
    getProperties().filter((property) => property.id !== id),
  );
}

export function addInterest(input: Omit<Interest, "id" | "createdAt">): Interest {
  const interest: Interest = {
    ...input,
    id: makeId("interest"),
    createdAt: new Date().toISOString(),
  };
  writeStorage(INTEREST_KEY, [interest, ...readStorage<Interest[]>(INTEREST_KEY, [])]);
  return interest;
}

export function reservePropertyUnit(
  input: Omit<Interest, "id" | "createdAt" | "mode">,
):
  | { status: "reserved"; interest: Interest; availableUnits: number }
  | { status: "already_reserved"; availableUnits: number }
  | { status: "full"; availableUnits: 0 } {
  const interests = readStorage<Interest[]>(INTEREST_KEY, []);
  const property = getPropertyById(input.propertyId);
  if (!property) return { status: "full", availableUnits: 0 };
  const availableUnits = getAvailableUnits(property);
  const existing = interests.find(
    (interest) =>
      interest.userId === input.userId &&
      interest.propertyId === input.propertyId &&
      interest.mode === "whole-unit",
  );
  if (existing) return { status: "already_reserved", availableUnits };
  if (availableUnits === 0) return { status: "full", availableUnits: 0 };

  const interest: Interest = {
    ...input,
    mode: "whole-unit",
    id: makeId("interest"),
    createdAt: new Date().toISOString(),
  };
  const remaining = availableUnits - 1;
  const totalUnits = getTotalUnits(property);
  writeStorage(INTEREST_KEY, [interest, ...interests]);
  writeStorage(
    PROPERTY_KEY,
    getProperties().map((item) =>
      item.id === property.id
        ? {
            ...item,
            totalUnits,
            availableUnits: remaining,
            availabilityStatus: getAvailabilityStatus({
              ...item,
              totalUnits,
              availableUnits: remaining,
            }),
          }
        : item,
    ),
  );
  return { status: "reserved", interest, availableUnits: remaining };
}

export function removeUserInterest(userId: string, propertyId: string): void {
  const interests = readStorage<Interest[]>(INTEREST_KEY, []);
  const removedReservation = interests.some(
    (interest) =>
      interest.userId === userId &&
      interest.propertyId === propertyId &&
      interest.mode === "whole-unit",
  );
  writeStorage(
    INTEREST_KEY,
    interests.filter(
      (interest) => !(interest.userId === userId && interest.propertyId === propertyId),
    ),
  );
  if (!removedReservation) return;
  writeStorage(
    PROPERTY_KEY,
    getProperties().map((property) => {
      if (property.id !== propertyId) return property;
      const totalUnits = getTotalUnits(property);
      const availableUnits = Math.min(totalUnits, getAvailableUnits(property) + 1);
      return {
        ...property,
        totalUnits,
        availableUnits,
        availabilityStatus: getAvailabilityStatus({
          ...property,
          totalUnits,
          availableUnits,
        }),
      };
    }),
  );
}

export function getFavorites(userId = "guest-user"): FavoriteProperty[] {
  return readStorage<FavoriteProperty[]>(FAVORITE_KEY, []).filter(
    (favorite) => favorite.userId === userId,
  );
}

export function isFavoriteProperty(propertyId: string, userId = "guest-user"): boolean {
  return getFavorites(userId).some((favorite) => favorite.propertyId === propertyId);
}

export function toggleFavoriteProperty(property: Property, userId = "guest-user"): boolean {
  const favorites = readStorage<FavoriteProperty[]>(FAVORITE_KEY, []);
  const exists = favorites.some(
    (favorite) => favorite.userId === userId && favorite.propertyId === property.id,
  );

  if (exists) {
    writeStorage(
      FAVORITE_KEY,
      favorites.filter(
        (favorite) => !(favorite.userId === userId && favorite.propertyId === property.id),
      ),
    );
    return false;
  }

  const favorite: FavoriteProperty = {
    id: makeId("favorite"),
    userId,
    propertyId: property.id,
    city: property.city,
    createdAt: new Date().toISOString(),
  };
  writeStorage(FAVORITE_KEY, [favorite, ...favorites]);
  return true;
}

export function removeFavoriteProperty(propertyId: string, userId = "guest-user"): void {
  writeStorage(
    FAVORITE_KEY,
    readStorage<FavoriteProperty[]>(FAVORITE_KEY, []).filter(
      (favorite) => !(favorite.userId === userId && favorite.propertyId === propertyId),
    ),
  );
}

export function addRoommatePreference(
  input: Omit<RoommatePreference, "id" | "createdAt">,
): RoommatePreference {
  const preference: RoommatePreference = {
    ...input,
    id: makeId("roommate"),
    createdAt: new Date().toISOString(),
  };
  writeStorage(ROOMMATE_KEY, [preference, ...readStorage<RoommatePreference[]>(ROOMMATE_KEY, [])]);
  return preference;
}

export function getRoommateRequests(): RoommateRequest[] {
  return getAllRoommateRequests().filter(
    (request) => (request.publicationStatus ?? "approved") === "approved",
  );
}

export function getAllRoommateRequests(): RoommateRequest[] {
  const saved = readStorage<RoommateRequest[]>(ROOMMATE_REQUEST_KEY, []);
  const realRequests = saved.filter(
    (request) =>
      !request.id.startsWith("demo-roommate-") &&
      !request.userId.startsWith("demo-user-") &&
      !request.propertyId?.startsWith("mock-"),
  );
  if (realRequests.length !== saved.length) writeStorage(ROOMMATE_REQUEST_KEY, realRequests);
  return realRequests;
}

export function getRoommateRequestById(id: string): RoommateRequest | null {
  return getRoommateRequests().find((request) => request.id === id) ?? null;
}

export function addRoommateRequest(
  input: Omit<RoommateRequest, "id" | "createdAt">,
): RoommateRequest {
  const request: RoommateRequest = {
    ...input,
    id: makeId("roommate-request"),
    createdAt: new Date().toISOString(),
  };
  writeStorage(ROOMMATE_REQUEST_KEY, [request, ...getAllRoommateRequests()]);
  return request;
}

export function moderateLocalRoommateRequest(
  id: string,
  publicationStatus: NonNullable<RoommateRequest["publicationStatus"]>,
  rejectionReason?: string,
): void {
  const reviewedAt = new Date().toISOString();
  writeStorage(
    ROOMMATE_REQUEST_KEY,
    getAllRoommateRequests().map((request) =>
      request.id === id
        ? {
            ...request,
            publicationStatus,
            rejectionReason: publicationStatus === "rejected" ? rejectionReason?.trim() : undefined,
            reviewedAt,
          }
        : request,
    ),
  );
}

export function deleteLocalRoommateRequest(id: string): void {
  writeStorage(
    ROOMMATE_REQUEST_KEY,
    getAllRoommateRequests().filter((request) => request.id !== id),
  );
}

export function updateRoommateCard(
  requestId: string,
  userId: string,
  input: {
    city: string;
    neighborhood: string;
    availableRooms: number;
    pricePerPerson: number;
    organization: string;
    bio: string;
  },
): RoommateRequest | null {
  const savedRequests = readStorage<RoommateRequest[]>(ROOMMATE_REQUEST_KEY, []);
  const existingRequest = savedRequests.find((request) => request.id === requestId);
  if (!existingRequest || existingRequest.userId !== userId) return null;

  const availableRooms = Math.max(1, input.availableRooms);
  const updatedRequest: RoommateRequest = {
    ...existingRequest,
    availableRooms,
    organization: input.organization.trim(),
    bio: input.bio.trim(),
    publicationStatus:
      existingRequest.publicationStatus === "rejected"
        ? "pending_review"
        : existingRequest.publicationStatus,
    submittedAt:
      existingRequest.publicationStatus === "rejected"
        ? new Date().toISOString()
        : existingRequest.submittedAt,
    rejectionReason:
      existingRequest.publicationStatus === "rejected"
        ? undefined
        : existingRequest.rejectionReason,
  };

  writeStorage(
    ROOMMATE_REQUEST_KEY,
    savedRequests.map((request) => (request.id === requestId ? updatedRequest : request)),
  );

  const properties = getProperties();
  const property = properties.find((item) => item.id === existingRequest.propertyId);
  if (property && property.ownerId === userId) {
    const updatedProperty: Property = {
      ...property,
      city: input.city.trim(),
      neighborhood: input.neighborhood.trim(),
      address: input.neighborhood.trim(),
      universityNearby: input.organization.trim() || property.universityNearby,
      minRooms: availableRooms,
      maxRooms: availableRooms,
      maxResidents: availableRooms,
      price: Math.max(1, input.pricePerPerson) * availableRooms,
      publicationStatus:
        property.publicationStatus === "rejected" ? "pending_review" : property.publicationStatus,
      status: property.publicationStatus === "rejected" ? "pending_review" : property.status,
      submittedAt:
        property.publicationStatus === "rejected" ? new Date().toISOString() : property.submittedAt,
      rejectionReason:
        property.publicationStatus === "rejected" ? undefined : property.rejectionReason,
    };
    writeStorage(
      PROPERTY_KEY,
      properties.map((item) => (item.id === updatedProperty.id ? updatedProperty : item)),
    );
  }

  return updatedRequest;
}

export function deleteRoommateCard(requestId: string, userId: string): boolean {
  const savedRequests = readStorage<RoommateRequest[]>(ROOMMATE_REQUEST_KEY, []);
  const target = savedRequests.find((request) => request.id === requestId);
  if (!target || target.userId !== userId) return false;

  const nextRequests = savedRequests.filter((request) => request.id !== requestId);
  writeStorage(ROOMMATE_REQUEST_KEY, nextRequests);
  writeStorage(
    ROOMMATE_JOIN_REQUEST_KEY,
    readStorage<RoommateJoinRequest[]>(ROOMMATE_JOIN_REQUEST_KEY, []).filter(
      (request) => request.requestId !== requestId,
    ),
  );
  writeStorage(
    ROOMMATE_VIEW_KEY,
    readStorage<RoommateRequestView[]>(ROOMMATE_VIEW_KEY, []).filter(
      (view) => view.requestId !== requestId,
    ),
  );

  const properties = getProperties();
  const property = properties.find((item) => item.id === target.propertyId);
  const hasOtherRequestForProperty = nextRequests.some(
    (request) => request.propertyId === target.propertyId,
  );
  if (
    property &&
    property.ownerId === userId &&
    property.propertyLicenseNumber === "external-roommate-card" &&
    !hasOtherRequestForProperty
  ) {
    writeStorage(
      PROPERTY_KEY,
      properties.filter((item) => item.id !== property.id),
    );
  }

  return true;
}

export function recordPropertyView(propertyId: string, userId = "guest-user"): void {
  if (!propertyId) return;
  const view: PropertyView = {
    id: makeId("property-view"),
    propertyId,
    userId,
    createdAt: new Date().toISOString(),
  };
  writeStorage(PROPERTY_VIEW_KEY, [view, ...readStorage<PropertyView[]>(PROPERTY_VIEW_KEY, [])]);
}

export function recordRoommateRequestView(requestId: string, userId = "guest-user"): void {
  if (!requestId) return;
  const view: RoommateRequestView = {
    id: makeId("roommate-view"),
    requestId,
    userId,
    createdAt: new Date().toISOString(),
  };
  writeStorage(ROOMMATE_VIEW_KEY, [
    view,
    ...readStorage<RoommateRequestView[]>(ROOMMATE_VIEW_KEY, []),
  ]);
}

export function addRoommateJoinRequest(input: {
  requestId: string;
  requesterUserId: string;
  requesterName: string;
}): RoommateJoinRequest | null {
  const targetRequest = getRoommateRequestById(input.requestId);
  if (!targetRequest || targetRequest.userId === input.requesterUserId) return null;
  const existing = readStorage<RoommateJoinRequest[]>(ROOMMATE_JOIN_REQUEST_KEY, []).find(
    (request) =>
      request.requestId === input.requestId && request.requesterUserId === input.requesterUserId,
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const joinRequest: RoommateJoinRequest = {
    id: makeId("roommate-join"),
    requestId: input.requestId,
    propertyId: targetRequest.propertyId,
    requesterUserId: input.requesterUserId,
    requesterName: input.requesterName,
    ownerUserId: targetRequest.userId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  writeStorage(ROOMMATE_JOIN_REQUEST_KEY, [
    joinRequest,
    ...readStorage<RoommateJoinRequest[]>(ROOMMATE_JOIN_REQUEST_KEY, []),
  ]);
  return joinRequest;
}

export function updateRoommateJoinRequestStatus(
  id: string,
  status: RoommateJoinRequest["status"],
): void {
  const now = new Date().toISOString();
  const next = readStorage<RoommateJoinRequest[]>(ROOMMATE_JOIN_REQUEST_KEY, []).map((request) =>
    request.id === id ? { ...request, status, updatedAt: now } : request,
  );
  writeStorage(ROOMMATE_JOIN_REQUEST_KEY, next);
}

export function getUserActivity(userId: string) {
  const properties = getProperties();
  const propertiesById = new Map(properties.map((property) => [property.id, property]));
  const roommateRequests = getAllRoommateRequests();
  const roommateRequestsById = new Map(roommateRequests.map((request) => [request.id, request]));
  const roommateViews = readStorage<RoommateRequestView[]>(ROOMMATE_VIEW_KEY, []);
  const propertyViews = readStorage<PropertyView[]>(PROPERTY_VIEW_KEY, []);
  const joinRequests = readStorage<RoommateJoinRequest[]>(ROOMMATE_JOIN_REQUEST_KEY, []);

  const favorites = getFavorites(userId).map((favorite) => ({
    favorite,
    property: propertiesById.get(favorite.propertyId) ?? null,
  }));
  const interests = getUserInterests(userId).map((interest) => ({
    interest,
    property: propertiesById.get(interest.propertyId) ?? null,
  }));
  const roommateCards = roommateRequests
    .filter((request) => request.userId === userId)
    .map((request) => {
      const incomingRequests = joinRequests.filter((item) => item.requestId === request.id);
      return {
        request,
        property: propertiesById.get(request.propertyId) ?? null,
        views: roommateViews.filter((view) => view.requestId === request.id).length,
        incomingRequests,
      };
    });
  const sentJoinRequests = joinRequests
    .map((request) => ({
      joinRequest: request,
      roommateRequest: roommateRequestsById.get(request.requestId) ?? null,
      property: propertiesById.get(request.propertyId) ?? null,
    }))
    .filter((item) => item.joinRequest.requesterUserId === userId);

  return {
    favorites,
    interests,
    roommateCards,
    sentJoinRequests,
    viewedProperties: propertyViews
      .filter((view) => view.userId === userId)
      .map((view) => ({ view, property: propertiesById.get(view.propertyId) ?? null })),
    viewedRoommateRequests: roommateViews
      .filter((view) => view.userId === userId)
      .map((view) => ({
        view,
        roommateRequest: roommateRequestsById.get(view.requestId) ?? null,
      })),
  };
}

export function addNegotiationSignal(
  input: Omit<NegotiationSignal, "id" | "createdAt">,
): NegotiationSignal {
  const signal: NegotiationSignal = {
    ...input,
    id: makeId("negotiation"),
    createdAt: new Date().toISOString(),
  };
  writeStorage(NEGOTIATION_KEY, [signal, ...readStorage<NegotiationSignal[]>(NEGOTIATION_KEY, [])]);
  return signal;
}
