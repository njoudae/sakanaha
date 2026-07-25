import type {
  Property,
  PropertyFacility,
  PropertyFeature,
  RentIncludedUtility,
} from "@saknaha/shared-types";

export const propertyFeatureOptions: Array<{ value: PropertyFeature; label: string }> = [
  { value: "cleaning_worker", label: "عامل تنظيف" },
  { value: "security_cameras", label: "كاميرات أمن" },
  { value: "elevator", label: "مصعد" },
];

export const propertyFacilityOptions: Array<{ value: PropertyFacility; label: string }> = [
  { value: "mosque", label: "مسجد" },
  { value: "grocery", label: "بقالة" },
  { value: "supermarket", label: "سوبرماركت" },
  { value: "malls", label: "مولات" },
];

export const rentIncludedOptions: Array<{ value: RentIncludedUtility; label: string }> = [
  { value: "electricity", label: "الكهرباء" },
  { value: "water", label: "الماء" },
  { value: "internet", label: "الإنترنت" },
];

export function getPropertyFeatures(property: Property): PropertyFeature[] {
  if (property.features) return property.features;
  return [
    ...(property.hasCleaningWorker ? (["cleaning_worker"] as const) : []),
    ...(property.hasElevator ? (["elevator"] as const) : []),
  ];
}
