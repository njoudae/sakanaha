import { mockProperties } from "@saknaha/constants/mockProperties";
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

const PROPERTY_KEY = "saknaha.properties";
const INTEREST_KEY = "saknaha.interests";
const FAVORITE_KEY = "saknaha.favorites";
const ROOMMATE_KEY = "saknaha.roommates";
const ROOMMATE_REQUEST_KEY = "saknaha.roommateRequests";
const NEGOTIATION_KEY = "saknaha.negotiations";
const PROPERTY_VIEW_KEY = "saknaha.propertyViews";
const ROOMMATE_VIEW_KEY = "saknaha.roommateViews";
const ROOMMATE_JOIN_REQUEST_KEY = "saknaha.roommateJoinRequests";

export function getProperties(): Property[] {
  const saved = readStorage<Property[]>(PROPERTY_KEY, []);
  if (saved.length > 0) {
    const normalized = saved.map(normalizeProperty);
    const savedIds = new Set(normalized.map((property) => property.id));
    const missingMockProperties = mockProperties.filter((property) => !savedIds.has(property.id));
    const merged = [...normalized, ...missingMockProperties];
    writeStorage(PROPERTY_KEY, merged);
    return merged;
  }
  writeStorage(PROPERTY_KEY, mockProperties);
  return mockProperties;
}

function normalizeProperty(property: Property & { rooms?: number }): Property {
  const roomCount = property.rooms ?? property.minRooms ?? 1;
  return {
    ...property,
    propertyLicenseNumber: property.propertyLicenseNumber || "غير محدد",
    googleMapsUrl: property.googleMapsUrl || "",
    minRooms: property.minRooms ?? roomCount,
    maxRooms: property.maxRooms ?? roomCount,
    floorsCount: property.floorsCount ?? 1,
    hasElevator: property.hasElevator ?? false,
    hasCleaningWorker: property.hasCleaningWorker ?? false,
    hasTransportService: property.hasTransportService ?? false,
    universityBusPasses: property.universityBusPasses ?? false,
    requiresLeaseContract: property.requiresLeaseContract ?? property.roommateAllowed ?? true,
    allowWhatsappContact: property.allowWhatsappContact ?? property.negotiable ?? false,
    videos: property.videos ?? [],
    services: property.services.map(normalizeService),
  };
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
  return getProperties().filter((property) => property.status === "published");
}

export function getOwnerSubmittedPublishedProperties(): Property[] {
  return getPublishedProperties().filter((property) => property.ownerId !== "mock-owner");
}

export function getPropertyById(id: string): Property | null {
  return getProperties().find((property) => property.id === id) ?? null;
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
  const nextProperty = property.id
    ? property
    : { ...property, id: makeId("property"), createdAt: new Date().toISOString() };
  const exists = properties.some((item) => item.id === nextProperty.id);
  const next = exists
    ? properties.map((item) => (item.id === nextProperty.id ? nextProperty : item))
    : [nextProperty, ...properties];
  writeStorage(PROPERTY_KEY, next);
  return nextProperty;
}

export function updatePropertyStatus(id: string, status: PropertyStatus): void {
  const next = getProperties().map((property) =>
    property.id === id ? { ...property, status } : property,
  );
  writeStorage(PROPERTY_KEY, next);
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

export function removeUserInterest(userId: string, propertyId: string): void {
  writeStorage(
    INTEREST_KEY,
    readStorage<Interest[]>(INTEREST_KEY, []).filter(
      (interest) => !(interest.userId === userId && interest.propertyId === propertyId),
    ),
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

function demoRoommateRequests(): RoommateRequest[] {
  const demoInputs = [
    {
      propertyId: "mock-badee",
      userType: "student" as const,
      requesterName: "أريج",
      age: 21,
      organization: "جامعة الملك خالد - قريقر",
      major: "حاسب",
      moveInDate: "سبتمبر 2026",
      bio: "طالبة هادئة وأفضل السكن المنظم والقريب من الجامعة.",
      availableRooms: 2,
    },
    {
      propertyId: "mock-nuzhah",
      userType: "employee" as const,
      requesterName: "نورة",
      age: 25,
      organization: "مقر عمل في أبها",
      major: "",
      moveInDate: "أغسطس 2026",
      bio: "موظفة أبحث عن شريكات سكن ملتزمات وبيئة مريحة.",
      availableRooms: 2,
    },
    {
      propertyId: "mock-king-road",
      userType: "student" as const,
      requesterName: "رهف",
      age: 22,
      organization: "جامعة الملك خالد - طريق الملك",
      major: "إدارة أعمال",
      moveInDate: "سبتمبر 2026",
      bio: "أبحث عن سكن مشترك قريب من الجامعة وبميزانية واضحة.",
      availableRooms: 1,
    },
  ];

  return demoInputs.map((request, index) => ({
    ...request,
    id: `demo-roommate-${index + 1}`,
    userId: `demo-user-${index + 1}`,
    createdAt: new Date().toISOString(),
  }));
}

export function getRoommateRequests(): RoommateRequest[] {
  const saved = readStorage<RoommateRequest[]>(ROOMMATE_REQUEST_KEY, []);
  const savedIds = new Set(saved.map((request) => request.id));
  const demos = demoRoommateRequests().filter((request) => !savedIds.has(request.id));
  const merged = [...saved, ...demos];
  writeStorage(ROOMMATE_REQUEST_KEY, merged);
  return merged;
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
  writeStorage(ROOMMATE_REQUEST_KEY, [request, ...getRoommateRequests()]);
  return request;
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
  const roommateRequests = getRoommateRequests();
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
