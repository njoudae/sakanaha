import type { AvailabilityStatus, Property } from "@saknaha/shared-types";

type PropertyInventory = Pick<
  Property,
  "availableUnits" | "availabilityStatus" | "maxResidents" | "totalUnits"
>;

export function getTotalUnits(property: PropertyInventory): number {
  return Math.max(0, Math.floor(property.totalUnits ?? property.maxResidents));
}

export function getAvailableUnits(property: PropertyInventory): number {
  return Math.min(
    getTotalUnits(property),
    Math.max(0, Math.floor(property.availableUnits ?? property.maxResidents)),
  );
}

export function getAvailabilityStatus(property: PropertyInventory): AvailabilityStatus {
  const total = getTotalUnits(property);
  const available = getAvailableUnits(property);
  if (available === 0 || total === 0) return "full";
  if (available <= Math.max(1, Math.ceil(total * 0.25))) return "nearly_full";
  return "available";
}

export function withNormalizedInventory(property: Property): Property {
  const totalUnits = getTotalUnits(property);
  const availableUnits = getAvailableUnits(property);
  return {
    ...property,
    totalUnits,
    availableUnits,
    availabilityStatus: getAvailabilityStatus({ ...property, totalUnits, availableUnits }),
  };
}
