import type { Property, UniversityLocation } from "@saknaha/shared-types";

export interface Coordinates {
  lat: number;
  lng: number;
}

export type GoogleMapsLocationParseResult =
  | { ok: true; coordinates: Coordinates; normalizedUrl: string }
  | {
      ok: false;
      reason:
        | "invalid_url"
        | "unsupported_protocol"
        | "unsupported_host"
        | "short_url"
        | "missing_coordinates"
        | "invalid_coordinates"
        | "suspected_swap";
    };

const SAUDI_BOUNDS = { minLat: 16, maxLat: 33, minLng: 34, maxLng: 56 };
const coordinatePattern = /^-?\d{1,3}(?:\.\d+)?$/;

export function isValidCoordinates(value: Coordinates | null | undefined): value is Coordinates {
  return Boolean(
    value &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    value.lng >= -180 &&
    value.lng <= 180 &&
    !(value.lat === 0 && value.lng === 0),
  );
}

export function normalizeCoordinates(value: Coordinates): Coordinates | null {
  if (!isValidCoordinates(value)) return null;
  return {
    lat: Number(value.lat.toFixed(6)),
    lng: Number(value.lng.toFixed(6)),
  };
}

export function isLikelySaudiCoordinate(value: Coordinates): boolean {
  return (
    isValidCoordinates(value) &&
    value.lat >= SAUDI_BOUNDS.minLat &&
    value.lat <= SAUDI_BOUNDS.maxLat &&
    value.lng >= SAUDI_BOUNDS.minLng &&
    value.lng <= SAUDI_BOUNDS.maxLng
  );
}

export function isLikelySwappedSaudiCoordinate(value: Coordinates): boolean {
  return (
    !isLikelySaudiCoordinate(value) && isLikelySaudiCoordinate({ lat: value.lng, lng: value.lat })
  );
}

export function approximateCoordinates(value: Coordinates): Coordinates | null {
  const normalized = normalizeCoordinates(value);
  if (!normalized) return null;
  return { lat: Number(normalized.lat.toFixed(2)), lng: Number(normalized.lng.toFixed(2)) };
}

export function getApprovedPropertyCoordinates(property: Property): Coordinates | null {
  if (property.locationVisibility === "private") return null;
  const coordinates = { lat: property.lat ?? Number.NaN, lng: property.lng ?? Number.NaN };
  if (!isValidCoordinates(coordinates)) return null;
  return property.locationVisibility === "approximate"
    ? approximateCoordinates(coordinates)
    : normalizeCoordinates(coordinates);
}

export function getPropertyCoordinatesForViewer(
  property: Property,
  canViewExact: boolean,
): Coordinates | null {
  const coordinates = { lat: property.lat ?? Number.NaN, lng: property.lng ?? Number.NaN };
  if (!isValidCoordinates(coordinates)) return null;
  if (canViewExact) return normalizeCoordinates(coordinates);
  return getApprovedPropertyCoordinates(property);
}

export function getDirectionsPropertyCoordinates(
  property: Property,
  canViewExact = false,
): Coordinates | null {
  if (property.locationVisibility === "approximate" && !canViewExact) return null;
  if (property.locationVisibility === "private" && !canViewExact) return null;
  const coordinates = { lat: property.lat ?? Number.NaN, lng: property.lng ?? Number.NaN };
  return normalizeCoordinates(coordinates);
}

function parsedCoordinatePair(latValue: string, lngValue: string): Coordinates | null {
  const lat = latValue.trim();
  const lng = lngValue.trim();
  if (!coordinatePattern.test(lat) || !coordinatePattern.test(lng)) return null;
  const coordinates = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng) ? coordinates : null;
}

function extractGoogleCoordinates(url: URL): Coordinates | null {
  const atMatch = url.pathname.match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:,|$)/);
  if (atMatch) return parsedCoordinatePair(atMatch[1], atMatch[2]);

  const dataMatch = `${url.pathname}${url.search}`.match(
    /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
  );
  if (dataMatch) return parsedCoordinatePair(dataMatch[1], dataMatch[2]);

  for (const key of ["q", "query", "destination", "ll"]) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    const match = value.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (match) return parsedCoordinatePair(match[1], match[2]);
  }
  return null;
}

export function parseGoogleMapsLocationUrl(value: string): GoogleMapsLocationParseResult {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "unsupported_protocol" };

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "maps.app.goo.gl" || hostname === "goo.gl") {
    return { ok: false, reason: "short_url" };
  }
  const googleHost = hostname === "google.com" || hostname.endsWith(".google.com");
  if (!googleHost || (!url.pathname.startsWith("/maps") && hostname !== "maps.google.com")) {
    return { ok: false, reason: "unsupported_host" };
  }

  const coordinates = extractGoogleCoordinates(url);
  if (!coordinates) return { ok: false, reason: "missing_coordinates" };
  if (!isValidCoordinates(coordinates)) return { ok: false, reason: "invalid_coordinates" };
  if (isLikelySwappedSaudiCoordinate(coordinates)) return { ok: false, reason: "suspected_swap" };
  const normalized = normalizeCoordinates(coordinates)!;
  return {
    ok: true,
    coordinates: normalized,
    normalizedUrl: `https://www.google.com/maps?q=${normalized.lat}%2C${normalized.lng}`,
  };
}

export async function resolveGoogleMapsLocationUrl(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<GoogleMapsLocationParseResult> {
  const parsed = parseGoogleMapsLocationUrl(value);
  if (parsed.ok || parsed.reason !== "short_url") return parsed;
  let input: URL;
  try {
    input = new URL(value.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  const hostname = input.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname !== "maps.app.goo.gl" && hostname !== "goo.gl") {
    return { ok: false, reason: "unsupported_host" };
  }
  try {
    const response = await fetcher(input.toString(), {
      method: "GET",
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    if (!response.ok) return { ok: false, reason: "invalid_url" };
    return parseGoogleMapsLocationUrl(response.url);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}

export function buildGoogleMapsDirectionsUrl(
  university: Pick<UniversityLocation, "lat" | "lng">,
  property: Coordinates,
): string | null {
  const origin = { lat: university.lat, lng: university.lng };
  if (!isValidCoordinates(origin) || !isValidCoordinates(property)) return null;

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${property.lat},${property.lng}`);
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}

export function straightLineDistanceKm(origin: Coordinates, destination: Coordinates): number {
  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) return Number.NaN;
  const radius = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(origin.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
