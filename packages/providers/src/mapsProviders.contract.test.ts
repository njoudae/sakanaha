import { describe, expect, it } from "vitest";
import { createGoogleMapsProvider } from "./googleMapsProvider";
import { createMapboxMapsProvider } from "./mapboxMapsProvider";
import { createOpenStreetMapProvider } from "./openStreetMapProvider";
import type { MapsProvider } from "./maps";
import {
  createFallbackMapsProvider,
  type FetchLike,
  type FetchResponseLike,
  type MapsUsageReporter,
} from "./mapsSupport";

class JsonResponse implements FetchResponseLike {
  constructor(
    private readonly body: unknown,
    readonly ok = true,
    readonly status = 200,
  ) {}

  async json() {
    return this.body;
  }
}

function fakeFetch(provider: MapsProvider["provider"]): FetchLike {
  return async (url) => {
    if (provider === "google") {
      if (url.includes("geocode")) {
        return new JsonResponse({
          status: "OK",
          results: [
            {
              formatted_address: "Abha, Saudi Arabia",
              place_id: "google-place-1",
              geometry: { location: { lat: 18.2164, lng: 42.5053 }, location_type: "ROOFTOP" },
            },
          ],
        });
      }
      if (url.includes("places:autocomplete")) {
        return new JsonResponse({
          suggestions: [
            {
              placePrediction: {
                placeId: "google-auto-1",
                text: { text: "King Khalid University" },
              },
            },
          ],
        });
      }
      if (url.includes("places:searchNearby")) {
        return new JsonResponse({
          places: [
            {
              id: "google-nearby-1",
              displayName: { text: "Laundry" },
              location: { latitude: 18.22, longitude: 42.51 },
              primaryType: "laundry",
            },
          ],
        });
      }
      return new JsonResponse({
        routes: [
          {
            distanceMeters: 12000,
            duration: "900s",
            description: "Fastest route",
            polyline: { encodedPolyline: "google-polyline" },
          },
        ],
      });
    }

    if (provider === "mapbox") {
      if (url.includes("directions")) {
        return new JsonResponse({
          routes: [
            { distance: 12000, duration: 900, geometry: "mapbox-polyline", weight_name: "auto" },
          ],
        });
      }
      return new JsonResponse({
        features: [
          {
            id: "mapbox-place-1",
            properties: {
              mapbox_id: "mapbox-place-1",
              full_address: "Abha, Saudi Arabia",
              name: "Abha",
              feature_type: "place",
            },
            geometry: { coordinates: [42.5053, 18.2164] },
          },
        ],
      });
    }

    if (url.includes("route")) {
      return new JsonResponse({
        routes: [{ distance: 12000, duration: 900, geometry: "osm-polyline" }],
      });
    }

    return new JsonResponse([
      {
        place_id: 1,
        osm_type: "N",
        osm_id: 2,
        lat: "18.2164",
        lon: "42.5053",
        display_name: "Abha, Saudi Arabia",
        category: "place",
        type: "city",
      },
    ]);
  };
}

function providerFactories(usageReporter: MapsUsageReporter) {
  return [
    {
      name: "google",
      provider: createGoogleMapsProvider(
        { fetch: fakeFetch("google"), usageReporter },
        { googleApiKey: "test-google-key" },
      ),
    },
    {
      name: "mapbox",
      provider: createMapboxMapsProvider(
        { fetch: fakeFetch("mapbox"), usageReporter },
        { mapboxAccessToken: "test-mapbox-token" },
      ),
    },
    {
      name: "openstreetmap",
      provider: createOpenStreetMapProvider(
        { fetch: fakeFetch("openstreetmap"), usageReporter },
        { userAgent: "saknaha-tests" },
      ),
    },
  ] as const;
}

describe("maps provider contract", () => {
  for (const factory of providerFactories(() => undefined)) {
    describe(factory.name, () => {
      it("normalizes geocode results", async () => {
        const results = await factory.provider.geocode("Abha");

        expect(results[0]).toMatchObject({
          formattedAddress: "Abha, Saudi Arabia",
          point: { lat: 18.2164, lng: 42.5053 },
        });
      });

      it("normalizes reverse geocode results", async () => {
        const results = await factory.provider.reverseGeocode({ lat: 18.2164, lng: 42.5053 });

        expect(results[0]?.formattedAddress).toBe("Abha, Saudi Arabia");
      });

      it("normalizes autocomplete results", async () => {
        const results = await factory.provider.autocomplete("King");

        expect(results[0]?.label).toBeTruthy();
        expect(results[0]?.providerPlaceId).toBeTruthy();
      });

      it("normalizes nearby search results", async () => {
        const results = await factory.provider.nearbySearch(
          { lat: 18.2164, lng: 42.5053 },
          "laundry",
        );

        expect(results[0]).toMatchObject({
          category: expect.any(String),
          point: expect.objectContaining({ lat: expect.any(Number), lng: expect.any(Number) }),
        });
      });

      it("normalizes route and travel time results", async () => {
        const route = await factory.provider.calculateRoute(
          { lat: 18.2164, lng: 42.5053 },
          { lat: 18.25, lng: 42.55 },
        );
        const travelTime = await factory.provider.calculateTravelTime(
          { lat: 18.2164, lng: 42.5053 },
          { lat: 18.25, lng: 42.55 },
        );

        expect(route.distanceMeters).toBe(12000);
        expect(route.travelTimeSeconds).toBe(900);
        expect(travelTime).toBe(900);
      });

      it("clusters markers through the shared contract", async () => {
        const clusters = await factory.provider.clusterMarkers([
          { id: "a", point: { lat: 18.2164, lng: 42.5053 } },
          { id: "b", point: { lat: 18.2165, lng: 42.5054 } },
        ]);

        expect(clusters[0]?.count).toBe(2);
        expect(clusters[0]?.itemIds).toEqual(["a", "b"]);
      });
    });
  }

  it("records normalized usage events", async () => {
    const events: string[] = [];
    const provider = createGoogleMapsProvider(
      {
        fetch: fakeFetch("google"),
        usageReporter: (event) => {
          events.push(`${event.provider}:${event.operation}:${event.status}`);
        },
      },
      { googleApiKey: "test-google-key" },
    );

    await provider.geocode("Abha");

    expect(events).toContain("google:geocode:success");
  });

  it("falls back when the selected provider fails", async () => {
    const primary = createGoogleMapsProvider(
      {
        fetch: async () => new JsonResponse({ error: "quota" }, false, 429),
      },
      { googleApiKey: "test-google-key" },
    );
    const fallback = createOpenStreetMapProvider(
      { fetch: fakeFetch("openstreetmap") },
      { userAgent: "saknaha-tests" },
    );
    const provider = createFallbackMapsProvider(primary, [fallback]);

    const results = await provider.geocode("Abha");

    expect(results[0]?.formattedAddress).toBe("Abha, Saudi Arabia");
  });

  it("skips a provider when the circuit breaker is open", async () => {
    const skipped: string[] = [];
    const primary = createGoogleMapsProvider(
      {
        fetch: fakeFetch("google"),
        circuitBreaker: () => false,
        healthReporter: (event) => {
          skipped.push(`${event.provider}:${event.status}`);
        },
      },
      { googleApiKey: "test-google-key" },
    );
    const fallback = createOpenStreetMapProvider(
      { fetch: fakeFetch("openstreetmap") },
      { userAgent: "saknaha-tests" },
    );
    const provider = createFallbackMapsProvider(primary, [fallback]);

    const results = await provider.reverseGeocode({ lat: 18.2164, lng: 42.5053 });

    expect(results[0]?.formattedAddress).toBe("Abha, Saudi Arabia");
    expect(skipped).toContain("google:skipped");
  });

  it("marks HTTP 429 and 5xx failures as retryable", async () => {
    const provider = createGoogleMapsProvider(
      {
        fetch: async () => new JsonResponse({ error: "unavailable" }, false, 503),
      },
      { googleApiKey: "test-google-key" },
    );

    await expect(provider.geocode("Abha")).rejects.toMatchObject({
      retryable: true,
    });
  });
});
