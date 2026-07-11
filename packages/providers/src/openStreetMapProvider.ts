import type {
  AddressResult,
  GeoPoint,
  MapsProvider,
  MapsRequestContext,
  NearbySearchResult,
  PlaceAutocompleteResult,
  RouteResult,
} from "./maps";
import {
  assertPoint,
  clusterByGrid,
  getJson,
  normalizeTravelMode,
  recordMapsUsage,
  type MapsProviderRuntime,
  type MapsProviderSecrets,
} from "./mapsSupport";

interface NominatimResult {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  category?: string;
  type?: string;
}

function normalizeNominatim(result: NominatimResult): AddressResult | null {
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    point: { lat, lng },
    formattedAddress: result.display_name ?? "",
    providerPlaceId:
      result.osm_type && result.osm_id !== undefined
        ? `${result.osm_type}${result.osm_id}`
        : String(result.place_id ?? ""),
    quality: "approximate",
  };
}

function headers(userAgent?: string): HeadersInit {
  return userAgent ? { "user-agent": userAgent } : {};
}

function osrmProfile(mode: MapsRequestContext["travelMode"]) {
  return normalizeTravelMode(mode) === "walking" ? "foot" : "driving";
}

export function createOpenStreetMapProvider(
  runtime: MapsProviderRuntime,
  secrets: Pick<MapsProviderSecrets, "userAgent"> = {},
): MapsProvider {
  async function nominatim(url: URL, operation: string, context?: MapsRequestContext) {
    try {
      const data = await getJson(runtime, "openstreetmap", operation, url.toString(), {
        headers: headers(secrets.userAgent),
      });
      const list = Array.isArray(data) ? data : [data];
      await recordMapsUsage(runtime, "openstreetmap", operation, "success", context);
      return list.flatMap((item) => {
        const result = normalizeNominatim(item as NominatimResult);
        return result === null ? [] : [result];
      });
    } catch (error) {
      await recordMapsUsage(runtime, "openstreetmap", operation, "failed", context);
      throw error;
    }
  }

  async function calculateRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    context?: MapsRequestContext,
  ): Promise<RouteResult> {
    assertPoint(origin);
    assertPoint(destination);
    const profile = osrmProfile(context?.travelMode);
    const url = new URL(
      `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
    );
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "polyline");
    try {
      const data = (await getJson(runtime, "openstreetmap", "calculateRoute", url.toString())) as {
        routes?: Array<{ distance?: number; duration?: number; geometry?: string }>;
      };
      const route = data.routes?.[0];
      const travelTimeSeconds = Math.round(route?.duration ?? 0);
      await recordMapsUsage(runtime, "openstreetmap", "calculateRoute", "success", context);
      return {
        distanceMeters: Math.round(route?.distance ?? 0),
        durationSeconds: travelTimeSeconds,
        travelTimeSeconds,
        polyline: route?.geometry,
      };
    } catch (error) {
      await recordMapsUsage(runtime, "openstreetmap", "calculateRoute", "failed", context);
      throw error;
    }
  }

  return {
    capability: "maps",
    provider: "openstreetmap",
    geocode: (query, context) => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("q", query);
      url.searchParams.set("countrycodes", context?.regionCode ?? "sa");
      url.searchParams.set("limit", "5");
      return nominatim(url, "geocode", context);
    },
    reverseGeocode: (point, context) => {
      assertPoint(point);
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(point.lat));
      url.searchParams.set("lon", String(point.lng));
      return nominatim(url, "reverseGeocode", context);
    },
    autocomplete: async (query, context) => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("q", query);
      url.searchParams.set("countrycodes", context?.regionCode ?? "sa");
      url.searchParams.set("limit", "5");
      const results = await nominatim(url, "autocomplete", context);
      return results.map<PlaceAutocompleteResult>((result) => ({
        providerPlaceId: result.providerPlaceId ?? result.formattedAddress,
        label: result.formattedAddress,
        point: result.point,
      }));
    },
    nearbySearch: async (point, category, context) => {
      assertPoint(point);
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("q", category);
      url.searchParams.set(
        "viewbox",
        `${point.lng - 0.03},${point.lat + 0.03},${point.lng + 0.03},${point.lat - 0.03}`,
      );
      url.searchParams.set("bounded", "1");
      url.searchParams.set("limit", "10");
      const results = await nominatim(url, "nearbySearch", context);
      return results.map<NearbySearchResult>((result) => ({
        providerPlaceId: result.providerPlaceId,
        name: result.formattedAddress,
        point: result.point,
        category,
      }));
    },
    calculateRoute,
    calculateTravelTime: async (origin, destination, context) =>
      (await calculateRoute(origin, destination, context)).travelTimeSeconds,
    clusterMarkers: async (markers) => clusterByGrid(markers),
  };
}
