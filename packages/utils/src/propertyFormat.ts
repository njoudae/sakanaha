import type { DistanceUnit, Property, ServiceNearby } from "@saknaha/shared-types";

export const distanceUnitLabels: Record<DistanceUnit, string> = {
  meter: "متر",
  kilometer: "كيلومتر",
  walking_minutes: "دقيقة مشيًا",
  driving_minutes: "دقيقة بالسيارة",
  hour: "ساعة",
};

export function formatRooms(property: Pick<Property, "minRooms" | "maxRooms">): string {
  if (property.minRooms === property.maxRooms) {
    return `${property.minRooms.toLocaleString("ar-SA")} ${property.minRooms === 1 ? "غرفة" : "غرف"}`;
  }
  return `${property.minRooms.toLocaleString("ar-SA")} - ${property.maxRooms.toLocaleString("ar-SA")} غرف`;
}

export function formatServiceDistance(service: ServiceNearby): string {
  return `${service.distanceValue.toLocaleString("ar-SA")} ${distanceUnitLabels[service.distanceUnit]}`;
}

export function getGoogleMapsUrl(
  property: Pick<Property, "googleMapsUrl" | "lat" | "lng">,
): string {
  if (property.googleMapsUrl?.trim()) return property.googleMapsUrl.trim();
  if (property.lat && property.lng)
    return `https://www.google.com/maps?q=${property.lat},${property.lng}`;
  return "";
}
