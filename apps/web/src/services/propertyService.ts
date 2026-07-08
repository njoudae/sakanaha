import { mockProperties } from "@saknaha/constants/mockProperties";
import type {
  DistanceUnit,
  FavoriteProperty,
  Interest,
  NegotiationSignal,
  Property,
  PropertyStatus,
  RoommatePreference,
  RoommateRequest,
  ServiceNearby,
} from "@saknaha/shared-types";
import { makeId, readStorage, writeStorage } from "./storage";

const PROPERTY_KEY = "saknaha.properties";
const INTEREST_KEY = "saknaha.interests";
const FAVORITE_KEY = "saknaha.favorites";
const ROOMMATE_KEY = "saknaha.roommates";
const ROOMMATE_REQUEST_KEY = "saknaha.roommateRequests";
const NEGOTIATION_KEY = "saknaha.negotiations";

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
