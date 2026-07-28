import { useMemo, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import type {
  Interest,
  Property,
  PropertyFacility,
  PropertyFeature,
  RentIncludedUtility,
  RoommateRequest,
} from "@saknaha/shared-types";
import {
  BusinessDataContext,
  emptyBusinessData,
  type BusinessActivity,
  type BusinessDataValue,
} from "./BusinessDataContext";

type PropertyRow = Doc<"properties"> & {
  ownerName?: string;
  ownerPhone?: string;
  images?: string[];
  videos?: string[];
  services?: Property["services"];
};

interface BusinessSnapshot {
  profile: Doc<"userProfiles"> | null;
  owner: Doc<"ownerProfiles"> | null;
  properties: PropertyRow[];
  ownerProperties: PropertyRow[];
  roommateRequests: Array<Doc<"roommateRequests"> & { requesterName?: string }>;
  favoritePropertyIds: Id<"properties">[];
  favorites: PropertyRow[];
  interests: Doc<"interests">[];
  roommateCards: Doc<"roommateRequests">[];
}

function dateString(value: number | undefined) {
  return value === undefined ? undefined : new Date(value).toISOString();
}

function paymentType(period: string): Property["paymentType"] {
  if (period === "yearly") return "سنوي";
  if (period === "academic_year") return "سنة دراسية";
  return "شهري";
}

function propertyFromRow(row: PropertyRow): Property {
  return {
    id: row._id,
    ownerId: row.ownerProfileId,
    ownerName: row.ownerName ?? "",
    ownerPhone: row.ownerPhone ?? "",
    title: row.title,
    propertyLicenseNumber: row.propertyLicenseNumber,
    region: row.region,
    city: row.city,
    neighborhood: row.neighborhood,
    district: row.district,
    landmark: row.landmark,
    address: row.address,
    universityNearby: row.universityNearby,
    googleMapsUrl: row.googleMapsUrl ?? "",
    lat: row.lat,
    lng: row.lng,
    locationVisibility: row.locationVisibility,
    classification: row.classification as Property["classification"],
    propertyType: row.propertyType as Property["propertyType"],
    minRooms: row.minRooms,
    maxRooms: row.maxRooms,
    floorsCount: row.floorsCount,
    hasElevator: row.hasElevator ?? row.features?.includes("elevator") ?? false,
    hasCleaningWorker: row.hasCleaningWorker ?? row.features?.includes("cleaning_worker") ?? false,
    features: (row.features ?? []) as PropertyFeature[],
    facilities: (row.facilities ?? []) as PropertyFacility[],
    rentIncludes: (row.rentIncludes ?? []) as RentIncludedUtility[],
    hasTransportService: row.hasTransportService ?? false,
    universityBusPasses: row.universityBusPasses ?? false,
    bathrooms: row.bathrooms,
    furnished: row.furnished,
    maxResidents: row.maxResidents,
    totalUnits: row.totalUnits,
    availableUnits: row.availableUnits,
    availabilityStatus: row.availabilityStatus,
    roommateAllowed: row.roommateAllowed,
    requiresLeaseContract: row.requiresLeaseContract,
    price: row.price,
    paymentType: paymentType(row.paymentType),
    rentalPrices: row.rentalPrices,
    negotiable: row.negotiable,
    allowWhatsappContact: row.allowWhatsappContact,
    deposit: row.deposit,
    priceNotes: row.priceNotes,
    services: row.services ?? [],
    images: row.images ?? [],
    videos: row.videos ?? [],
    status: row.status as Property["status"],
    publicationStatus: row.publicationStatus,
    rejectionReason: row.rejectionReason,
    submittedAt: dateString(row.submittedAt),
    reviewedAt: dateString(row.reviewedAt),
    paymentCompleted: row.paymentCompleted,
    workflowStatus: row.workflowStatus,
    paymentStatus: row.paymentStatus === "unpaid" ? undefined : row.paymentStatus,
    distanceText: "",
    timeText: "",
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function roommateFromRow(
  row: Doc<"roommateRequests"> & { requesterName?: string },
): RoommateRequest {
  return {
    id: row._id,
    propertyId: row.linkedPropertyId ?? row.propertyId ?? "",
    linkedPropertyId: row.linkedPropertyId,
    userId: row.userId,
    requesterName: row.requesterName,
    userType: row.userType,
    age: row.age,
    organization: row.organization,
    major: row.major,
    moveInDate: row.moveInDate,
    bio: row.bio,
    availableRooms: row.availableRooms,
    source: row.source,
    pricePerPerson: row.pricePerPerson,
    preferences: row.preferences,
    region: row.region,
    city: row.city,
    district: row.district,
    landmark: row.landmark,
    universityBranchId: row.universityBranchId,
    approximateLat: row.approximateLat,
    approximateLng: row.approximateLng,
    publicationStatus: row.publicationStatus,
    rejectionReason: row.rejectionReason,
    submittedAt: dateString(row.submittedAt),
    reviewedAt: dateString(row.reviewedAt),
    workflowStatus:
      row.workflowStatus === "draft" ||
      row.workflowStatus === "pending_payment" ||
      row.workflowStatus === "paid" ||
      row.workflowStatus === "published" ||
      row.workflowStatus === "suspended" ||
      row.workflowStatus === "hidden" ||
      row.workflowStatus === "deleted"
        ? row.workflowStatus
        : undefined,
    paymentStatus: row.paymentStatus === "unpaid" ? undefined : row.paymentStatus,
    externalHousing: row.externalHousing,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function propertyArgs(property: Property) {
  const displayPricePeriod =
    Object.entries(property.rentalPrices ?? {}).find(
      ([, value]) => value === property.price,
    )?.[0] ?? "monthly";
  return {
    title: property.title,
    propertyLicenseNumber: property.propertyLicenseNumber,
    region: property.region,
    city: property.city,
    neighborhood: property.neighborhood,
    district: property.district,
    landmark: property.landmark,
    address: property.address,
    universityNearby: property.universityNearby,
    googleMapsUrl: property.googleMapsUrl || undefined,
    lat: property.lat,
    lng: property.lng,
    locationVisibility: property.locationVisibility,
    locationQuality: "manual" as const,
    classification: property.classification,
    propertyType: property.propertyType,
    minRooms: property.minRooms,
    maxRooms: property.maxRooms,
    floorsCount: property.floorsCount,
    bathrooms: property.bathrooms,
    furnished: property.furnished,
    maxResidents: property.maxResidents,
    totalUnits: property.totalUnits ?? 1,
    availableUnits: property.availableUnits ?? property.totalUnits ?? 1,
    roommateAllowed: property.roommateAllowed,
    requiresLeaseContract: property.requiresLeaseContract ?? true,
    features: property.features ?? [],
    facilities: property.facilities ?? [],
    rentIncludes: property.rentIncludes ?? [],
    hasTransportService: property.hasTransportService,
    universityBusPasses: property.universityBusPasses,
    rentalPrices: {
      daily: property.rentalPrices?.daily,
      weekly: property.rentalPrices?.weekly,
      monthly: property.rentalPrices?.monthly,
      yearly: property.rentalPrices?.yearly,
    },
    displayPricePeriod: (["daily", "weekly", "monthly", "yearly"].includes(displayPricePeriod)
      ? displayPricePeriod
      : "monthly") as "daily" | "weekly" | "monthly" | "yearly",
    negotiable: property.negotiable,
    allowWhatsappContact: property.allowWhatsappContact,
    deposit: property.deposit,
    priceNotes: property.priceNotes,
  };
}

export function ConvexBusinessProvider({
  authenticated,
  children,
}: {
  authenticated: boolean;
  children: ReactNode;
}) {
  const rawSnapshot = useQuery(api.business.snapshot, {});
  const snapshot = rawSnapshot as BusinessSnapshot | undefined;
  const createProperty = useMutation(api.properties.createDraft);
  const updateProperty = useMutation(api.properties.updateMine);
  const submitProperty = useMutation(api.submissions.submitPropertyForReview);
  const archiveProperty = useMutation(api.properties.archiveMine);
  const setFavorite = useMutation(api.users.setFavorite);
  const registerInterest = useMutation(api.interests.register);
  const withdrawInterest = useMutation(api.interests.withdraw);
  const requestBooking = useMutation(api.bookings.request);
  const createRoommate = useMutation(api.roommates.createDraft);
  const updateRoommate = useMutation(api.roommates.updateMine);
  const closeRoommate = useMutation(api.roommates.closeMine);
  const registerRoommateInterest = useMutation(api.roommates.registerInterest);
  const updateProfile = useMutation(api.users.updateMine);

  const value = useMemo<BusinessDataValue>(() => {
    if (snapshot === undefined) return { ...emptyBusinessData, loading: true };
    const properties = snapshot.properties.map(propertyFromRow);
    const allProperties = new Map(
      [...snapshot.properties, ...snapshot.ownerProperties, ...snapshot.favorites].map((row) => [
        row._id,
        propertyFromRow(row),
      ]),
    );
    const interests = snapshot.interests.map((row) => ({
      interest: {
        id: row._id,
        userId: row.userId,
        propertyId: row.propertyId,
        mode: row.mode as Interest["mode"],
        createdAt: new Date(row.createdAt).toISOString(),
      },
      property: allProperties.get(row.propertyId) ?? null,
    }));
    const activity: BusinessActivity = {
      favorites: snapshot.favorites.map((row) => ({ property: propertyFromRow(row) })),
      interests,
      roommateCards: snapshot.roommateCards.map((row) => ({
        request: roommateFromRow(row),
        property:
          row.linkedPropertyId === undefined
            ? null
            : (allProperties.get(row.linkedPropertyId) ?? null),
        views: 0,
        incomingRequests: [],
      })),
      sentJoinRequests: [],
      viewedProperties: [],
      viewedRoommateRequests: [],
    };
    return {
      loading: false,
      properties,
      ownerProperties: snapshot.ownerProperties.map(propertyFromRow),
      roommateRequests: snapshot.roommateRequests.map(roommateFromRow),
      favoritePropertyIds: snapshot.favoritePropertyIds,
      activity,
      saveProperty: async (property) => {
        if (!authenticated) throw new Error("Authentication is required.");
        const args = propertyArgs(property);
        if (property.id && snapshot.ownerProperties.some((item) => item._id === property.id)) {
          await updateProperty({
            propertyId: property.id as Id<"properties">,
            ...args,
          });
          return property.id;
        }
        return await createProperty(args);
      },
      submitProperty: async (propertyId) => {
        await submitProperty({ propertyId: propertyId as Id<"properties"> });
      },
      setPropertyPaused: async (propertyId, paused) => {
        if (paused) {
          await archiveProperty({
            propertyId: propertyId as Id<"properties">,
            reason: "Property owner paused this listing",
          });
        } else {
          throw new Error("An archived property must be resubmitted for review.");
        }
      },
      setFavorite: async (propertyId, favorite) => {
        await setFavorite({ propertyId: propertyId as Id<"properties">, favorite });
      },
      registerPropertyInterest: async (propertyId, mode) => {
        await registerInterest({ propertyId: propertyId as Id<"properties">, mode });
      },
      withdrawPropertyInterest: async (propertyId) => {
        await withdrawInterest({ propertyId: propertyId as Id<"properties"> });
      },
      requestBooking: async (propertyId) => {
        await requestBooking({
          propertyId: propertyId as Id<"properties">,
          startDate: new Date().toISOString().slice(0, 10),
          pricingPeriod: "monthly",
        });
      },
      createRoommateCard: async (request) =>
        await createRoommate({
          source: request.source ?? "external_property",
          linkedPropertyId: request.linkedPropertyId as Id<"properties"> | undefined,
          externalHousing: request.externalHousing,
          userType: request.userType,
          age: request.age,
          organization: request.organization,
          major: request.major,
          moveInDate: /^\d{4}-\d{2}-\d{2}$/.test(request.moveInDate)
            ? request.moveInDate
            : new Date().toISOString().slice(0, 10),
          bio: request.bio,
          availableRooms: request.availableRooms,
          pricePerPerson: request.pricePerPerson ?? 1,
          preferences: request.preferences ?? {
            smoking: "no",
            guests: "no_preference",
            sleep: "flexible",
            cleanliness: "no_preference",
            pets: "not_allowed",
            cooking: "occasionally",
            occupation: "both",
            noise: "no_preference",
          },
          region: request.region,
          city: request.city,
          district: request.district,
          landmark: request.landmark,
        }),
      updateRoommateCard: async (requestId, request) => {
        await updateRoommate({
          requestId: requestId as Id<"roommateRequests">,
          source: request.source ?? "external_property",
          linkedPropertyId: request.linkedPropertyId as Id<"properties"> | undefined,
          externalHousing: request.externalHousing,
          userType: request.userType,
          age: request.age,
          organization: request.organization,
          major: request.major,
          moveInDate: request.moveInDate,
          bio: request.bio,
          availableRooms: request.availableRooms,
          pricePerPerson: request.pricePerPerson ?? 1,
          preferences: request.preferences!,
          region: request.region,
          city: request.city,
          district: request.district,
          landmark: request.landmark,
        });
      },
      closeRoommateCard: async (requestId) => {
        await closeRoommate({
          requestId: requestId as Id<"roommateRequests">,
          reason: "Card owner closed this roommate card",
        });
      },
      registerRoommateInterest: async (requestId) => {
        await registerRoommateInterest({ requestId: requestId as Id<"roommateRequests"> });
      },
      updateUserProfile: async (input) => {
        await updateProfile({
          name: input.name,
          city: input.city,
          roommatePreferences: input.roommatePreferences,
        });
      },
    };
  }, [
    archiveProperty,
    authenticated,
    closeRoommate,
    createProperty,
    createRoommate,
    registerInterest,
    registerRoommateInterest,
    requestBooking,
    setFavorite,
    snapshot,
    submitProperty,
    updateProfile,
    updateProperty,
    updateRoommate,
    withdrawInterest,
  ]);

  return <BusinessDataContext.Provider value={value}>{children}</BusinessDataContext.Provider>;
}
