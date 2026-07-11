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

interface GoogleGeocodeResponse {
  status: string;
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: { location?: { lat?: number; lng?: number }; location_type?: string };
  }>;
}

function googleQuality(locationType?: string): AddressResult["quality"] {
  return locationType === "ROOFTOP" ? "verified" : "geocoded";
}

function googleHeaders(apiKey: string, fieldMask?: string): HeadersInit {
  return {
    "content-type": "application/json",
    "X-Goog-Api-Key": apiKey,
    ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
  };
}

function parseDurationSeconds(value: unknown): number {
  if (typeof value !== "string") return 0;
  return Number(value.replace("s", "")) || 0;
}

export function createGoogleMapsProvider(
  runtime: MapsProviderRuntime,
  secrets: Pick<MapsProviderSecrets, "googleApiKey">,
): MapsProvider {
  const apiKey = secrets.googleApiKey ?? "";
  if (!apiKey) {
    throw new MapsProviderError(
      "GOOGLE_MAPS_API_KEY is required.",
      "google",
      "configuration",
      false,
    );
  }

  async function geocodeRequest(url: string, operation: string, context?: MapsRequestContext) {
    try {
      const data = (await getJson(runtime, "google", operation, url)) as GoogleGeocodeResponse;
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new MapsProviderError(`Google Maps returned ${data.status}.`, "google", operation);
      }
      const results = (data.results ?? []).flatMap<AddressResult>((result) => {
        const location = result.geometry?.location;
        if (typeof location?.lat !== "number" || typeof location.lng !== "number") return [];
        return [
          {
            point: { lat: location.lat, lng: location.lng },
            formattedAddress: result.formatted_address ?? "",
            providerPlaceId: result.place_id,
            quality: googleQuality(result.geometry?.location_type),
          },
        ];
      });
      await recordMapsUsage(runtime, "google", operation, "success", context);
      return results;
    } catch (error) {
      await recordMapsUsage(runtime, "google", operation, "failed", context);
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
    const travelMode = normalizeTravelMode(context?.travelMode).toUpperCase();
    try {
      const data = (await getJson(
        runtime,
        "google",
        "calculateRoute",
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: googleHeaders(
            apiKey,
            "routes.distanceMeters,routes.duration,routes.description,routes.polyline.encodedPolyline",
          ),
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
            destination: {
              location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
            },
            travelMode,
          }),
        },
      )) as {
        routes?: Array<{
          distanceMeters?: number;
          duration?: string;
          description?: string;
          polyline?: { encodedPolyline?: string };
        }>;
      };
      const route = data.routes?.[0];
      const travelTimeSeconds = parseDurationSeconds(route?.duration);
      await recordMapsUsage(runtime, "google", "calculateRoute", "success", context);
      return {
        distanceMeters: route?.distanceMeters ?? 0,
        durationSeconds: travelTimeSeconds,
        travelTimeSeconds,
        summary: route?.description,
        polyline: route?.polyline?.encodedPolyline,
      };
    } catch (error) {
      await recordMapsUsage(runtime, "google", "calculateRoute", "failed", context);
      throw error;
    }
  }

  return {
    capability: "maps",
    provider: "google",
    geocode: (query, context) => {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", query);
      url.searchParams.set("key", apiKey);
      if (context?.language) url.searchParams.set("language", context.language);
      if (context?.regionCode) url.searchParams.set("region", context.regionCode);
      return geocodeRequest(url.toString(), "geocode", context);
    },
    reverseGeocode: (point, context) => {
      assertPoint(point);
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("latlng", `${point.lat},${point.lng}`);
      url.searchParams.set("key", apiKey);
      if (context?.language) url.searchParams.set("language", context.language);
      return geocodeRequest(url.toString(), "reverseGeocode", context);
    },
    autocomplete: async (query, context) => {
      const data = (await getJson(
        runtime,
        "google",
        "autocomplete",
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: googleHeaders(
            apiKey,
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
          ),
          body: JSON.stringify({
            input: query,
            includedRegionCodes: context?.regionCode ? [context.regionCode] : ["sa"],
          }),
        },
      )) as {
        suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } } }>;
      };
      await recordMapsUsage(runtime, "google", "autocomplete", "success", context);
      return (data.suggestions ?? []).flatMap<PlaceAutocompleteResult>((suggestion) => {
        const prediction = suggestion.placePrediction;
        if (!prediction?.placeId || !prediction.text?.text) return [];
        return [{ providerPlaceId: prediction.placeId, label: prediction.text.text }];
      });
    },
    nearbySearch: async (point, category, context) => {
      assertPoint(point);
      const data = (await getJson(
        runtime,
        "google",
        "nearbySearch",
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: googleHeaders(
            apiKey,
            "places.id,places.displayName,places.location,places.primaryType",
          ),
          body: JSON.stringify({
            includedTypes: [category],
            maxResultCount: 10,
            locationRestriction: {
              circle: { center: { latitude: point.lat, longitude: point.lng }, radius: 1500 },
            },
          }),
        },
      )) as {
        places?: Array<{
          id?: string;
          displayName?: { text?: string };
          location?: { latitude?: number; longitude?: number };
          primaryType?: string;
        }>;
      };
      await recordMapsUsage(runtime, "google", "nearbySearch", "success", context);
      return (data.places ?? []).flatMap<NearbySearchResult>((place) => {
        if (
          typeof place.location?.latitude !== "number" ||
          typeof place.location.longitude !== "number"
        )
          return [];
        return [
          {
            providerPlaceId: place.id,
            name: place.displayName?.text ?? "",
            point: { lat: place.location.latitude, lng: place.location.longitude },
            category: place.primaryType ?? category,
          },
        ];
      });
    },
    calculateRoute,
    calculateTravelTime: async (origin, destination, context) =>
      (await calculateRoute(origin, destination, context)).travelTimeSeconds,
    clusterMarkers: async (markers) => clusterByGrid(markers),
  };
}
