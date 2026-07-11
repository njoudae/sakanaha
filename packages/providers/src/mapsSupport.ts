import type {
  GeoPoint,
  MapsProvider,
  MapsProviderName,
  MapsRequestContext,
  MapsQuotaStatus,
  MarkerClusterInput,
  MarkerClusterResult,
  RouteResult,
  TravelMode,
} from "./maps";
import type { ProviderUsageEvent } from "./providerTypes";

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<FetchResponseLike>;

export type MapsUsageReporter = (event: ProviderUsageEvent) => Promise<void> | void;

export type MapsHealthReporter = (event: {
  provider: MapsProviderName;
  operation: string;
  responseTimeMs: number;
  quotaStatus: MapsQuotaStatus;
  status: "success" | "failure" | "skipped";
  retryable: boolean;
}) => Promise<void> | void;

export type MapsCircuitBreaker = (
  provider: MapsProviderName,
  operation: string,
) => Promise<boolean> | boolean;

export interface MapsRateLimiter {
  consume(provider: MapsProviderName, operation: string): Promise<void>;
}

export class MapsProviderError extends Error {
  constructor(
    message: string,
    readonly provider: MapsProviderName,
    readonly operation: string,
    readonly retryable = true,
  ) {
    super(message);
    this.name = "MapsProviderError";
  }
}

export interface MapsProviderRuntime {
  fetch: FetchLike;
  usageReporter?: MapsUsageReporter;
  healthReporter?: MapsHealthReporter;
  circuitBreaker?: MapsCircuitBreaker;
  rateLimiter?: MapsRateLimiter;
  now?: () => string;
}

export interface MapsProviderSecrets {
  googleApiKey?: string;
  mapboxAccessToken?: string;
  userAgent?: string;
}

export function assertPoint(point: GeoPoint) {
  if (
    !Number.isFinite(point.lat) ||
    !Number.isFinite(point.lng) ||
    point.lat < -90 ||
    point.lat > 90 ||
    point.lng < -180 ||
    point.lng > 180
  ) {
    throw new Error("Invalid geographic point.");
  }
}

export function normalizeTravelMode(mode: TravelMode | undefined): TravelMode {
  return mode ?? "driving";
}

function quotaStatusForResponse(status: number): MapsQuotaStatus {
  return status === 429 ? "limited" : "unknown";
}

export async function getJson(
  runtime: MapsProviderRuntime,
  provider: MapsProviderName,
  operation: string,
  url: string,
  init?: RequestInit,
) {
  if (runtime.circuitBreaker && !(await runtime.circuitBreaker(provider, operation))) {
    await runtime.healthReporter?.({
      provider,
      operation,
      responseTimeMs: 0,
      quotaStatus: "unknown",
      status: "skipped",
      retryable: true,
    });
    throw new MapsProviderError("Maps provider circuit breaker is open.", provider, operation);
  }

  const startedAt = Date.now();
  await runtime.rateLimiter?.consume(provider, operation);
  try {
    const response = await runtime.fetch(url, init);
    const responseTimeMs = Date.now() - startedAt;
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      await runtime.healthReporter?.({
        provider,
        operation,
        responseTimeMs,
        quotaStatus: quotaStatusForResponse(response.status),
        status: "failure",
        retryable,
      });
      throw new MapsProviderError(
        `Maps provider returned HTTP ${response.status}.`,
        provider,
        operation,
        retryable,
      );
    }
    await runtime.healthReporter?.({
      provider,
      operation,
      responseTimeMs,
      quotaStatus: "unknown",
      status: "success",
      retryable: false,
    });
    return await response.json();
  } catch (error) {
    if (error instanceof MapsProviderError) throw error;
    await runtime.healthReporter?.({
      provider,
      operation,
      responseTimeMs: Date.now() - startedAt,
      quotaStatus: "unknown",
      status: "failure",
      retryable: true,
    });
    throw error;
  }
}

export async function recordMapsUsage(
  runtime: MapsProviderRuntime,
  provider: MapsProviderName,
  operation: string,
  status: "success" | "failed" | "skipped",
  context?: MapsRequestContext,
) {
  await runtime.usageReporter?.({
    capability: "maps",
    provider,
    operation,
    unitCount: 1,
    status,
    context,
    createdAt: runtime.now?.() ?? new Date().toISOString(),
  });
}

export function haversineMeters(origin: GeoPoint, destination: GeoPoint) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function clusterByGrid(
  markers: MarkerClusterInput[],
  precision = 0.02,
): MarkerClusterResult[] {
  const groups = new Map<string, MarkerClusterInput[]>();
  for (const marker of markers) {
    assertPoint(marker.point);
    const key = `${Math.round(marker.point.lat / precision)}:${Math.round(marker.point.lng / precision)}`;
    groups.set(key, [...(groups.get(key) ?? []), marker]);
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    const point = {
      lat: items.reduce((sum, item) => sum + item.point.lat, 0) / items.length,
      lng: items.reduce((sum, item) => sum + item.point.lng, 0) / items.length,
    };
    return {
      id: key,
      point,
      count: items.length,
      itemIds: items.map((item) => item.id),
    };
  });
}

export function fallbackRoute(origin: GeoPoint, destination: GeoPoint): RouteResult {
  const distanceMeters = Math.round(haversineMeters(origin, destination));
  const travelTimeSeconds = Math.max(60, Math.round(distanceMeters / 11.1));
  return {
    distanceMeters,
    durationSeconds: travelTimeSeconds,
    travelTimeSeconds,
    summary: "Estimated straight-line travel time fallback",
  };
}

export function createFallbackMapsProvider(
  primary: MapsProvider,
  fallbacks: readonly MapsProvider[],
): MapsProvider {
  async function withFallback<T>(
    operation: keyof MapsProvider,
    run: (provider: MapsProvider) => Promise<T>,
  ) {
    const providers = [primary, ...fallbacks];
    let lastError: unknown;
    for (const provider of providers) {
      try {
        return await run(provider);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`Maps operation ${String(operation)} failed.`);
  }

  return {
    capability: "maps",
    provider: primary.provider,
    healthCheck: () =>
      primary.healthCheck?.() ??
      Promise.resolve({ status: "healthy", checkedAt: new Date().toISOString() }),
    geocode: (query, context) =>
      withFallback("geocode", (provider) => provider.geocode(query, context)),
    reverseGeocode: (point, context) =>
      withFallback("reverseGeocode", (provider) => provider.reverseGeocode(point, context)),
    autocomplete: (query, context) =>
      withFallback("autocomplete", (provider) => provider.autocomplete(query, context)),
    nearbySearch: (point, category, context) =>
      withFallback("nearbySearch", (provider) => provider.nearbySearch(point, category, context)),
    calculateRoute: async (origin, destination, context) => {
      try {
        return await withFallback("calculateRoute", (provider) =>
          provider.calculateRoute(origin, destination, context),
        );
      } catch {
        return fallbackRoute(origin, destination);
      }
    },
    calculateTravelTime: async (origin, destination, context) => {
      const route = await withFallback("calculateTravelTime", (provider) =>
        provider.calculateRoute(origin, destination, context),
      );
      return route.travelTimeSeconds;
    },
    clusterMarkers: (markers) => primary.clusterMarkers(markers),
  };
}
