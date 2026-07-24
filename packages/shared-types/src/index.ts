export type UserRole = "student" | "employee";
export type PropertyStatus =
  | "published"
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived"
  | "unpublished"
  | "paused";
export type PublicationStatus =
  "draft" | "pending_review" | "approved" | "rejected" | "archived" | "unpublished";
export type PropertyType = "شقة" | "دور" | "غرفة" | "عمارة" | "سكن مشترك";
export type PropertyClassification =
  "نسائي بالكامل" | "عوائل" | "دور نسائي داخل سكن عوائل" | "متاح للجميع";
export type PaymentType = "شهري" | "سنوي" | "سنة دراسية";
export type RentalPeriod = "daily" | "weekly" | "monthly" | "yearly";
export type RentalPrices = Partial<Record<RentalPeriod, number>>;
export type ServiceType = "بقالة" | "مطعم" | "مغسلة" | "صيدلية" | "مواصلات" | "جامعة" | "غير ذلك";
export type DistanceUnit = "meter" | "kilometer" | "walking_minutes" | "driving_minutes" | "hour";

export interface Owner {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  nationalId?: string;
  region?: string;
  ministryPropertyNumber: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  platformRole?: "admin" | "support" | "moderator" | "owner" | "user" | "service_provider";
  city: string;
  monthlyBudget: number;
  acceptsRoommate: boolean;
  selectedUniversityBranchId?: string;
  createdAt: string;
}

export interface ServiceNearby {
  id: string;
  type: ServiceType;
  name: string;
  distanceValue: number;
  distanceUnit: DistanceUnit;
}

export interface Property {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  title: string;
  propertyLicenseNumber: string;
  region?: string;
  city: string;
  neighborhood: string;
  district?: string;
  landmark?: string;
  address: string;
  universityNearby: string;
  googleMapsUrl: string;
  lat?: number;
  lng?: number;
  locationVisibility?: "exact" | "approximate" | "private";
  classification: PropertyClassification;
  propertyType: PropertyType;
  minRooms: number;
  maxRooms: number;
  floorsCount: number;
  hasElevator: boolean;
  hasCleaningWorker: boolean;
  hasTransportService: boolean;
  universityBusPasses: boolean;
  bathrooms: number;
  furnished: boolean;
  maxResidents: number;
  roommateAllowed: boolean;
  requiresLeaseContract?: boolean;
  price: number;
  paymentType: PaymentType;
  rentalPrices?: RentalPrices;
  negotiable: boolean;
  allowWhatsappContact: boolean;
  deposit?: number;
  priceNotes?: string;
  services: ServiceNearby[];
  images: string[];
  videos?: string[];
  status: PropertyStatus;
  publicationStatus?: PublicationStatus;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  paymentCompleted?: boolean;
  distanceText: string;
  timeText: string;
  createdAt: string;
}

export interface University {
  id: string;
  name: string;
  region?: string;
  city: string;
  active: boolean;
}

export interface Interest {
  id: string;
  userId: string;
  propertyId: string;
  mode: "whole-unit" | "roommate" | "visit" | "general";
  createdAt: string;
}

export interface FavoriteProperty {
  id: string;
  userId: string;
  propertyId: string;
  city: string;
  createdAt: string;
}

export interface RoommatePreference {
  id: string;
  userId: string;
  propertyId: string;
  roomsWanted: number;
  acceptsSharedContract: boolean;
  createdAt: string;
}

export interface RoommateRequest {
  id: string;
  propertyId: string;
  userId: string;
  requesterName?: string;
  userType: UserRole;
  age: number;
  organization: string;
  major?: string;
  moveInDate: string;
  bio: string;
  availableRooms: number;
  region?: string;
  city?: string;
  district?: string;
  landmark?: string;
  universityBranchId?: string;
  approximateLat?: number;
  approximateLng?: number;
  publicationStatus?: PublicationStatus;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface PropertyView {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}

export interface RoommateRequestView {
  id: string;
  userId: string;
  requestId: string;
  createdAt: string;
}

export interface RoommateJoinRequest {
  id: string;
  requestId: string;
  propertyId: string;
  requesterUserId: string;
  requesterName: string;
  ownerUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationSignal {
  id: string;
  userId: string;
  propertyId: string;
  suggestedPrice: number;
  reason: string;
  createdAt: string;
}

export interface UniversityLocation {
  id: string;
  universityId: string;
  universityName?: string;
  region?: string;
  city: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  active: boolean;
}
