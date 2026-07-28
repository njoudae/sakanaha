import type { Property, RoommateRequest } from "@saknaha/shared-types";
import { getAvailabilityStatus } from "./propertyAvailability";

export type PropertyCardAvailability = "available" | "nearlyFull" | "full";

export interface PropertyCardPresentation {
  availability: PropertyCardAvailability;
  classification: string;
  price: number;
  pricePeriod: string;
  title: string;
  type: Property["propertyType"];
}

function propertyClassificationLabel(property: Property): string {
  if (property.classification === "نسائي بالكامل") return "سكن نسائي بالكامل";
  if (property.classification === "دور نسائي داخل سكن عوائل") {
    return "دور نسائي في عمارة عوائل";
  }
  return property.classification;
}

function propertyPricePeriod(property: Property): string {
  if (property.paymentType === "سنوي") return "سنة";
  if (property.paymentType === "سنة دراسية") return "سنة دراسية";
  return "شهر";
}

export function getPropertyCardPresentation(property: Property): PropertyCardPresentation {
  const availability = getAvailabilityStatus(property);

  return {
    availability: availability === "nearly_full" ? "nearlyFull" : availability,
    classification: propertyClassificationLabel(property),
    price: property.price,
    pricePeriod: propertyPricePeriod(property),
    title: property.title.trim() || propertyClassificationLabel(property),
    type: property.propertyType,
  };
}

export function getRoommatePricePerPerson(
  request: RoommateRequest,
  property: Property | null,
): number {
  return (
    request.pricePerPerson ??
    (property ? Math.ceil(property.price / Math.max(1, property.maxResidents)) : 0)
  );
}

export function getRoommateRequesterName(request: RoommateRequest): string {
  return request.requesterName?.trim() || "باحثة عن شريكة سكن";
}
