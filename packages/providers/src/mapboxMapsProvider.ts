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
  MapsProviderError,
  normalizeTravelMode,
  recordMapsUsage,
  type MapsProviderRuntime,
  type MapsProviderSecrets,
} from "./mapsSupport";

interface MapboxFeature {
  id?: string;
  type?: string;
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: { latitude?: number; longitude?: number };
    feature_type?: string;
  };
  geometry?: { coordinates?: [number, number] };
}

function featurePoint(feature: MapboxFeature): GeoPoint | null {
  const coordinates = feature.geometry?.coordinates;
  if (coordinates) return { lng: coordinates[0], lat: coordinates[1] };
  const location = feature.properties?.coordinates;
  if (typeof location?.latitude === "number" && typeof location.longitude === "number") {
    return { lat: location.latitude, lng: location.longitude };
  }
  return null;
}

function normalizeFeature(feature: MapboxFeature): AddressResult | null {
  const point = featurePoint(feature);
  if (point === null) return null;
  return {
    point,
    formattedAddress:
      feature.properties?.full_address ??
      feature.properties?.place_formatted ??
      feature.properties?.name ??
      "",
    providerPlaceId: feature.properties?.mapbox_id ?? feature.id,
    quality: "geocoded",
  };
}

function profileForMode(mode: MapsRequestContext["travelMode"]) {
  switch (normalizeTravelMode(mode)) {
    case "walking":
      return "walking";
    case "bicycling":
      return "cycling";
    default:
      return "driving";
  }
}

export function createMapboxMapsProvider(
  runtime: MapsProviderRuntime,
  secrets: Pick<MapsProviderSecrets, "mapboxAccessToken">,
): MapsProvider {
  const accessToken = secrets.mapboxAccessToken ?? "";
  if (!accessToken) {
    throw new MapsProviderError(
      "MAPBOX_ACCESS_TOKEN is required.",
      "mapbox",
      "configuration",
      false,
    );
  }

  async function search(url: URL, operation: string, context?: MapsRequestContext) {
    try {
      url.searchParams.set("access_token", accessToken);
      const data = (await getJson(runtime, "mapbox", operation, url.toString())) as {
        features?: MapboxFeature[];
      };
      await recordMapsUsage(runtime, "mapbox", operation, "success", context);
      return (data.features ?? []).flatMap((feature) => {
        const result = normalizeFeature(feature);
        return result === null ? [] : [result];
      });
    } catch (error) {
      await recordMapsUsage(runtime, "mapbox", operation, "failed", context);
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
    const profile = profileForMode(context?.travelMode);
    const url = new URL(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
    );
    url.searchParams.set("geometries", "polyline");
    url.searchParams.set("access_token", accessToken);
    try {
      const data = (await getJson(runtime, "mapbox", "calculateRoute", url.toString())) as {
        routes?: Array<{
          distance?: number;
          duration?: number;
          geometry?: string;
          weight_name?: string;
        }>;
      };
      const route = data.routes?.[0];
      const travelTimeSeconds = Math.round(route?.duration ?? 0);
      await recordMapsUsage(runtime, "mapbox", "calculateRoute", "success", context);
      return {
        distanceMeters: Math.round(route?.distance ?? 0),
        durationSeconds: travelTimeSeconds,
        travelTimeSeconds,
        summary: route?.weight_name,
        polyline: route?.geometry,
      };
    } catch (error) {
      await recordMapsUsage(runtime, "mapbox", "calculateRoute", "failed", context);
      throw error;
    }
  }

  return {
    capability: "maps",
    provider: "mapbox",
    geocode: (query, context) => {
      const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
      url.searchParams.set("q", query);
      url.searchParams.set("limit", "5");
      url.searchParams.set("country", context?.regionCode ?? "sa");
      return search(url, "geocode", context);
    },
    reverseGeocode: (point, context) => {
      assertPoint(point);
      const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
      url.searchParams.set("longitude", String(point.lng));
      url.searchParams.set("latitude", String(point.lat));
      url.searchParams.set("limit", "5");
      return search(url, "reverseGeocode", context);
    },
    autocomplete: async (query, context) => {
      const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
      url.searchParams.set("q", query);
      url.searchParams.set("autocomplete", "true");
      url.searchParams.set("limit", "5");
      url.searchParams.set("country", context?.regionCode ?? "sa");
      const results = await search(url, "autocomplete", context);
      return results.map<PlaceAutocompleteResult>((result) => ({
        providerPlaceId: result.providerPlaceId ?? result.formattedAddress,
        label: result.formattedAddress,
        point: result.point,
      }));
    },
    nearbySearch: async (point, category, context) => {
      assertPoint(point);
      const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
      url.searchParams.set("q", category);
      url.searchParams.set("proximity", `${point.lng},${point.lat}`);
      url.searchParams.set("limit", "10");
      const results = await search(url, "nearbySearch", context);
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
