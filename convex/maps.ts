import {
  createFallbackMapsProvider,
  createGoogleMapsProvider,
  createMapboxMapsProvider,
  createOpenStreetMapProvider,
  createProviderConfiguration,
  type GeoPoint,
  type MapsRequestContext,
  type MapsProvider,
  type MapsProviderName,
  type ProviderUsageEvent,
  type RouteResult,
} from "@saknaha/providers";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";

const point = v.object({
  lat: v.number(),
  lng: v.number(),
});

const context = v.optional(
  v.object({
    language: v.optional(v.string()),
    regionCode: v.optional(v.string()),
    travelMode: v.optional(
      v.union(
        v.literal("driving"),
        v.literal("walking"),
        v.literal("bicycling"),
        v.literal("transit"),
      ),
    ),
  }),
);

const addressResult = v.object({
  point,
  formattedAddress: v.string(),
  providerPlaceId: v.optional(v.string()),
  quality: v.union(
    v.literal("manual"),
    v.literal("geocoded"),
    v.literal("verified"),
    v.literal("approximate"),
  ),
});

const routeResult = v.object({
  distanceMeters: v.number(),
  durationSeconds: v.number(),
  travelTimeSeconds: v.number(),
  summary: v.optional(v.string()),
  polyline: v.optional(v.string()),
});

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function providerPriority(selected: MapsProviderName, fallbacks: readonly MapsProviderName[]) {
  return [selected, ...fallbacks].filter(
    (provider, index, values) =>
      provider !== "disabled" && values.findIndex((value) => value === provider) === index,
  );
}

function createProvider(
  name: MapsProviderName,
  runtime: Parameters<typeof createGoogleMapsProvider>[0],
  paidCallsEnabled: boolean,
) {
  if ((name === "google" || name === "mapbox") && !paidCallsEnabled) {
    return null;
  }
  if (name === "google" && process.env.GOOGLE_MAPS_API_KEY) {
    return createGoogleMapsProvider(runtime, { googleApiKey: process.env.GOOGLE_MAPS_API_KEY });
  }
  if (name === "mapbox" && process.env.MAPBOX_ACCESS_TOKEN) {
    return createMapboxMapsProvider(runtime, {
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
    });
  }
  if (name === "openstreetmap") {
    return createOpenStreetMapProvider(runtime, {
      userAgent: process.env.OPENSTREETMAP_USER_AGENT ?? "Saknaha Maps",
    });
  }
  return null;
}

function createConfiguredProvider(ctx: ActionCtx) {
  const config = createProviderConfiguration(process.env).maps;
  const runtime = {
    fetch: (url: string, init?: RequestInit) => fetch(url, init),
    usageReporter: async (event: ProviderUsageEvent) => {
      await ctx.runMutation(internal.mapsUsage.recordProviderUsage, {
        provider: event.provider,
        operation: event.operation,
        unitCount: event.unitCount,
        status: event.status,
        metadata: event.metadata,
      });
    },
    rateLimiter: {
      consume: async (provider: MapsProviderName, operation: string) => {
        await ctx.runMutation(internal.mapsUsage.consumeMapsRateLimit, {
          provider,
          operation,
          limit: config.quotaPerMinute,
        });
      },
    },
    circuitBreaker: async (provider: MapsProviderName, operation: string) =>
      await ctx.runQuery(internal.mapsHealth.canUseProvider, {
        provider,
        operation,
        now: Date.now(),
      }),
    healthReporter: async (event: {
      provider: MapsProviderName;
      operation: string;
      responseTimeMs: number;
      quotaStatus: "ok" | "near_limit" | "limited" | "unknown";
      status: "success" | "failure" | "skipped";
      retryable: boolean;
    }) => {
      await ctx.runMutation(internal.mapsHealth.recordHealth, {
        provider: event.provider,
        operation: event.operation,
        responseTimeMs: event.responseTimeMs,
        quotaStatus: event.quotaStatus,
        status: event.status,
        retryable: event.retryable,
        failureThreshold: config.circuitBreakerFailureThreshold,
        cooldownMs: config.circuitBreakerCooldownMs,
      });
    },
  };

  const providers = providerPriority(config.provider, config.fallbackProviders)
    .map((provider) => createProvider(provider, runtime, config.paidCallsEnabled))
    .filter((provider): provider is MapsProvider => provider !== null);

  if (providers.length === 0) {
    throw new Error("No maps provider is configured.");
  }

  return createFallbackMapsProvider(providers[0], providers.slice(1));
}

function cacheTtlMs() {
  return createProviderConfiguration(process.env).maps.cacheTtlSeconds * 1000;
}

export const geocode = action({
  args: {
    query: v.string(),
    context,
  },
  returns: v.array(addressResult),
  handler: async (ctx, args) => {
    const provider = createConfiguredProvider(ctx);
    const requestHash = await sha256Hex(
      JSON.stringify({
        op: "geocode",
        provider: provider.provider,
        query: args.query,
        context: args.context,
      }),
    );
    const now = Date.now();
    const cached = await ctx.runQuery(internal.mapsCache.getGeocodeCache, {
      provider: provider.provider,
      requestHash,
      now,
    });
    if (cached !== null) {
      return [
        {
          point: { lat: cached.lat, lng: cached.lng },
          formattedAddress: cached.formattedAddress ?? "",
          quality: cached.quality,
        },
      ];
    }

    const results = await provider.geocode(args.query, args.context);
    const first = results[0];
    if (first) {
      await ctx.runMutation(internal.mapsCache.storeGeocodeCache, {
        provider: provider.provider,
        requestHash,
        query: args.query,
        lat: first.point.lat,
        lng: first.point.lng,
        formattedAddress: first.formattedAddress,
        quality: first.quality,
        expiresAt: now + cacheTtlMs(),
      });
    }
    return results;
  },
});

export const reverseGeocode = action({
  args: {
    point,
    context,
  },
  returns: v.array(addressResult),
  handler: async (ctx, args) => {
    const provider = createConfiguredProvider(ctx);
    const requestHash = await sha256Hex(
      JSON.stringify({
        op: "reverseGeocode",
        provider: provider.provider,
        point: args.point,
        context: args.context,
      }),
    );
    const now = Date.now();
    const cached = await ctx.runQuery(internal.mapsCache.getGeocodeCache, {
      provider: provider.provider,
      requestHash,
      now,
    });
    if (cached !== null) {
      return [
        {
          point: { lat: cached.lat, lng: cached.lng },
          formattedAddress: cached.formattedAddress ?? "",
          quality: cached.quality,
        },
      ];
    }

    const results = await provider.reverseGeocode(args.point, args.context);
    const first = results[0];
    if (first) {
      await ctx.runMutation(internal.mapsCache.storeGeocodeCache, {
        provider: provider.provider,
        requestHash,
        query: `${args.point.lat},${args.point.lng}`,
        lat: first.point.lat,
        lng: first.point.lng,
        formattedAddress: first.formattedAddress,
        quality: first.quality,
        expiresAt: now + cacheTtlMs(),
      });
    }
    return results;
  },
});

async function getRouteWithCache(
  ctx: ActionCtx,
  origin: GeoPoint,
  destination: GeoPoint,
  contextValue: MapsRequestContext | undefined,
) {
  const provider = createConfiguredProvider(ctx);
  const requestHash = await sha256Hex(
    JSON.stringify({
      op: "calculateRoute",
      provider: provider.provider,
      origin,
      destination,
      context: contextValue,
    }),
  );
  const now = Date.now();
  const cached = await ctx.runQuery(internal.mapsCache.getRouteCache, {
    provider: provider.provider,
    requestHash,
    now,
  });
  if (cached !== null) {
    return {
      distanceMeters: cached.distanceMeters,
      durationSeconds: cached.durationSeconds,
      travelTimeSeconds: cached.durationSeconds,
      summary: cached.routeSummary,
    };
  }

  const route = await provider.calculateRoute(origin, destination, contextValue);
  await ctx.runMutation(internal.mapsCache.storeRouteCache, {
    provider: provider.provider,
    requestHash,
    originLat: origin.lat,
    originLng: origin.lng,
    destinationLat: destination.lat,
    destinationLng: destination.lng,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.travelTimeSeconds,
    routeSummary: route.summary,
    expiresAt: now + cacheTtlMs(),
  });
  return route;
}

export const calculateRoute = action({
  args: {
    origin: point,
    destination: point,
    context,
  },
  returns: routeResult,
  handler: async (ctx, args): Promise<RouteResult> =>
    await getRouteWithCache(ctx, args.origin, args.destination, args.context),
});

export const calculateTravelTime = action({
  args: {
    origin: point,
    destination: point,
    context,
  },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const route = await getRouteWithCache(ctx, args.origin, args.destination, args.context);
    return route.travelTimeSeconds;
  },
});
