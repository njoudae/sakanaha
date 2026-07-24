import type {
  DistanceUnit,
  PaymentType,
  Property,
  RentalPeriod,
  RentalPrices,
  ServiceNearby,
} from "@saknaha/shared-types";
import { getPropertyCoordinatesForViewer, parseGoogleMapsLocationUrl } from "./directions";

export const distanceUnitLabels: Record<DistanceUnit, string> = {
  meter: "متر",
  kilometer: "كيلومتر",
  walking_minutes: "دقيقة مشيًا",
  driving_minutes: "دقيقة بالسيارة",
  hour: "ساعة",
};

export const rentalPeriodLabels: Record<RentalPeriod, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
  yearly: "سنوي",
};

export const rentalPeriodOrder: readonly RentalPeriod[] = ["daily", "weekly", "monthly", "yearly"];

export function rentalPeriodFromPaymentType(paymentType: PaymentType): RentalPeriod {
  return paymentType === "سنوي" ? "yearly" : "monthly";
}

export function paymentTypeFromRentalPeriod(period: RentalPeriod): PaymentType {
  return period === "yearly" ? "سنوي" : "شهري";
}

export function getRentalPrices(
  property: Pick<Property, "price" | "paymentType" | "rentalPrices">,
): Array<{ period: RentalPeriod; price: number }> {
  const configured = rentalPeriodOrder.flatMap((period) => {
    const price = property.rentalPrices?.[period];
    return typeof price === "number" && Number.isFinite(price) && price > 0
      ? [{ period, price }]
      : [];
  });
  if (configured.length > 0) return configured;
  return [
    {
      period: rentalPeriodFromPaymentType(property.paymentType),
      price: Math.max(0, property.price),
    },
  ];
}

export function normalizeRentalPrices(
  property: Pick<Property, "price" | "paymentType" | "rentalPrices">,
): RentalPrices {
  return Object.fromEntries(
    getRentalPrices(property).map(({ period, price }) => [period, price]),
  ) as RentalPrices;
}

export function formatRentalPrices(
  property: Pick<Property, "price" | "paymentType" | "rentalPrices">,
): string {
  return getRentalPrices(property)
    .map(
      ({ period, price }) =>
        `${price.toLocaleString("ar-SA")} ريال / ${rentalPeriodLabels[period]}`,
    )
    .join(" • ");
}

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
  property: Pick<Property, "googleMapsUrl" | "lat" | "lng" | "locationVisibility">,
  options: { canViewExact?: boolean } = {},
): string {
  const coordinates = getPropertyCoordinatesForViewer(
    property as Property,
    options.canViewExact === true,
  );
  if (!coordinates) return "";
  const parsed = property.googleMapsUrl?.trim()
    ? parseGoogleMapsLocationUrl(property.googleMapsUrl)
    : null;
  if (
    parsed?.ok &&
    parsed.coordinates.lat === coordinates.lat &&
    parsed.coordinates.lng === coordinates.lng
  ) {
    return parsed.normalizedUrl;
  }
  return `https://www.google.com/maps?q=${coordinates.lat}%2C${coordinates.lng}`;
}
