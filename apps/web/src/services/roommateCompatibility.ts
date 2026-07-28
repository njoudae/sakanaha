import type {
  Property,
  PropertyType,
  RoommateLifestylePreferences,
  RoommateRequest,
  User,
} from "@saknaha/shared-types";

const TOTAL_WEIGHT = 108;

interface CompatibilityInput {
  property: Property;
  card: RoommateRequest;
  applicant: User;
  applicantPreferences: RoommateLifestylePreferences;
  preferredNeighborhood: string;
  preferredPropertyType: PropertyType;
  preferredMonthlyBudget: number;
  applicantCoordinates?: { lat: number; lng: number } | null;
}

export interface CompatibilityResult {
  score: number;
  matchReasons: string[];
  differenceReasons: string[];
}

export function calculateRoommateCompatibility(input: CompatibilityInput): CompatibilityResult {
  let achieved = 0;
  const matchReasons: string[] = [];
  const differenceReasons: string[] = [];
  const target = input.card.preferences;

  add(input.property.city === input.applicant.city, 20, "نفس المدينة", "المدينة مختلفة");
  add(
    normalize(input.property.neighborhood) === normalize(input.preferredNeighborhood),
    15,
    "الحي مناسب",
    "الحي المفضل مختلف",
  );

  const distance =
    input.applicantCoordinates &&
    input.property.lat !== undefined &&
    input.property.lng !== undefined
      ? distanceKm(input.applicantCoordinates, {
          lat: input.property.lat,
          lng: input.property.lng,
        })
      : null;
  if (distance !== null && distance <= 5) {
    achieved += 15;
    matchReasons.push("الموقع قريب");
  } else if (distance !== null && distance <= 15) {
    achieved += 8;
    matchReasons.push("الموقع ضمن نطاق متوسط");
  } else {
    differenceReasons.push(distance === null ? "المسافة غير محددة" : "الموقع بعيد");
  }

  add(
    input.preferredMonthlyBudget > 0 &&
      (input.card.pricePerPerson ?? input.property.price) <= input.preferredMonthlyBudget,
    15,
    "السعر ضمن الميزانية",
    "السعر أعلى من الميزانية",
  );
  add(
    input.property.propertyType === input.preferredPropertyType,
    10,
    "نوع العقار مفضل",
    "نوع العقار مختلف",
  );

  if (target) {
    add(
      target.occupation === "both" || target.occupation === input.applicant.role,
      5,
      "الصفة الدراسية أو الوظيفية مناسبة",
      "الصفة الدراسية أو الوظيفية مختلفة",
    );
    add(
      target.smoking === input.applicantPreferences.smoking,
      8,
      "التدخين متوافق",
      "التدخين مختلف",
    );
    add(
      compatible(target.guests, input.applicantPreferences.guests),
      7,
      "تفضيل الضيوف متوافق",
      "تفضيل الضيوف مختلف",
    );
    add(
      target.sleep === "flexible" ||
        input.applicantPreferences.sleep === "flexible" ||
        target.sleep === input.applicantPreferences.sleep,
      5,
      "مواعيد النوم متوافقة",
      "مواعيد النوم مختلفة",
    );
    add(
      compatible(target.cleanliness, input.applicantPreferences.cleanliness),
      5,
      "مستوى النظافة متوافق",
      "مستوى النظافة مختلف",
    );
    add(
      target.pets === input.applicantPreferences.pets,
      5,
      "تفضيل الحيوانات متوافق",
      "تفضيل الحيوانات مختلف",
    );
    add(
      target.cooking === input.applicantPreferences.cooking,
      3,
      "عادات الطبخ متوافقة",
      "عادات الطبخ مختلفة",
    );
    if (compatible(target.noise, input.applicantPreferences.noise)) {
      matchReasons.push("مستوى الهدوء متوافق");
    } else {
      differenceReasons.push("مستوى الهدوء مختلف");
    }
  } else {
    differenceReasons.push("لم تضف صاحبة البطاقة تفضيلاتها بعد");
  }

  return {
    score: Math.max(0, Math.min(100, Math.round((achieved / TOTAL_WEIGHT) * 100))),
    matchReasons,
    differenceReasons,
  };

  function add(matches: boolean, weight: number, match: string, difference: string) {
    if (matches) {
      achieved += weight;
      matchReasons.push(match);
    } else {
      differenceReasons.push(difference);
    }
  }
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ar-SA");
}

function compatible(left: string, right: string) {
  return left === "no_preference" || right === "no_preference" || left === right;
}

function distanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
