import type { DistanceUnit, Property, ServiceNearby } from "@saknaha/shared-types";

export const distanceUnitLabels: Record<DistanceUnit, string> = {
  meter: "متر",
  kilometer: "كيلومتر",
  walking_minutes: "دقيقة مشيًا",
  driving_minutes: "دقيقة بالسيارة",
  hour: "ساعة",
};

export function formatRooms(property: Pick<Property, "minRooms" | "maxRooms">): string {
  const minRooms = Math.min(property.minRooms, property.maxRooms);
  const maxRooms = Math.max(property.minRooms, property.maxRooms);

  if (minRooms === maxRooms) {
    return `${minRooms.toLocaleString("ar-SA")} ${minRooms === 1 ? "غرفة" : "غرف"}`;
  }
  return `${minRooms.toLocaleString("ar-SA")} - ${maxRooms.toLocaleString("ar-SA")} غرف`;
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
