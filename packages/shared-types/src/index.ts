export type UserRole = "student" | "employee";
export type PropertyStatus = "published" | "draft" | "paused";
export type PropertyType = "شقة" | "دور" | "غرفة" | "عمارة" | "سكن مشترك";
export type PropertyClassification =
  "نسائي بالكامل" | "عوائل" | "دور نسائي داخل سكن عوائل" | "متاح للجميع";
export type PaymentType = "شهري" | "سنوي" | "سنة دراسية";
export type ServiceType = "بقالة" | "مطعم" | "مغسلة" | "صيدلية" | "مواصلات" | "جامعة" | "غير ذلك";
export type DistanceUnit = "meter" | "kilometer" | "walking_minutes" | "driving_minutes" | "hour";

export interface Owner {
  id: string;
  fullName: string;
  phone: string;
  ministryPropertyNumber: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  city: string;
  monthlyBudget: number;
  acceptsRoommate: boolean;
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
  city: string;
  neighborhood: string;
  address: string;
  universityNearby: string;
  googleMapsUrl: string;
  lat?: number;
  lng?: number;
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
  negotiable: boolean;
  allowWhatsappContact: boolean;
  deposit?: number;
  priceNotes?: string;
  services: ServiceNearby[];
  images: string[];
  videos?: string[];
  status: PropertyStatus;
  distanceText: string;
  timeText: string;
  createdAt: string;
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
  userType: UserRole;
  age: number;
  organization: string;
  major?: string;
  moveInDate: string;
  bio: string;
  availableRooms: number;
  createdAt: string;
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
  city: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
}
