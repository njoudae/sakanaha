export interface SaudiRegion {
  name: string;
  cities: readonly string[];
}

export const saudiRegions: readonly SaudiRegion[] = [
  { name: "منطقة الرياض", cities: ["الرياض", "الخرج"] },
  { name: "منطقة مكة المكرمة", cities: ["جدة", "مكة المكرمة"] },
  { name: "المنطقة الشرقية", cities: ["الدمام", "الأحساء", "حفر الباطن"] },
  { name: "منطقة المدينة المنورة", cities: ["المدينة المنورة", "ينبع"] },
  { name: "منطقة القصيم", cities: ["القصيم"] },
  { name: "منطقة عسير", cities: ["أبها", "خميس مشيط", "محايل", "بيشة", "النماص"] },
  { name: "منطقة تبوك", cities: ["تبوك"] },
  { name: "منطقة حائل", cities: ["حائل"] },
  { name: "منطقة الجوف", cities: ["سكاكا"] },
  { name: "منطقة الحدود الشمالية", cities: ["عرعر"] },
  { name: "منطقة جازان", cities: ["جازان"] },
  { name: "منطقة نجران", cities: ["نجران"] },
  { name: "منطقة الباحة", cities: ["الباحة"] },
] as const;

export function citiesForRegion(region: string): readonly string[] {
  return saudiRegions.find((item) => item.name === region)?.cities ?? [];
}

export function regionForCity(city: string): string {
  return saudiRegions.find((item) => item.cities.includes(city))?.name ?? "";
}
