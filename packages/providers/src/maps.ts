import type { ProviderAdapterBase, ProviderConfig, ProviderUsageContext } from "./providerTypes";

export type MapsProviderName = "google" | "mapbox" | "openstreetmap" | "disabled";
export type TravelMode = "driving" | "walking" | "bicycling" | "transit";
export type LocationQuality = "manual" | "geocoded" | "verified" | "approximate";
export type MapsQuotaStatus = "ok" | "near_limit" | "limited" | "unknown";

export interface MapsRequestContext extends ProviderUsageContext {
  language?: string;
  regionCode?: string;
  travelMode?: TravelMode;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AddressResult {
  point: GeoPoint;
  formattedAddress: string;
  providerPlaceId?: string;
  quality: LocationQuality;
}

export interface PlaceAutocompleteResult {
  providerPlaceId: string;
  label: string;
  city?: string;
  point?: GeoPoint;
}

export interface NearbySearchResult {
  providerPlaceId?: string;
  name: string;
  point: GeoPoint;
  category: string;
  distanceMeters?: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  travelTimeSeconds: number;
  summary?: string;
  polyline?: string;
}

export interface MarkerClusterInput {
  id: string;
  point: GeoPoint;
  weight?: number;
}

export interface MarkerClusterResult {
  id: string;
  point: GeoPoint;
  count: number;
  itemIds: string[];
}

export interface MapsProvider extends ProviderAdapterBase<MapsProviderName> {
  geocode(query: string, context?: MapsRequestContext): Promise<AddressResult[]>;
  reverseGeocode(point: GeoPoint, context?: MapsRequestContext): Promise<AddressResult[]>;
  autocomplete(query: string, context?: MapsRequestContext): Promise<PlaceAutocompleteResult[]>;
  nearbySearch(
    point: GeoPoint,
    category: string,
    context?: MapsRequestContext,
  ): Promise<NearbySearchResult[]>;
  calculateRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    context?: MapsRequestContext,
  ): Promise<RouteResult>;
  calculateTravelTime(
    origin: GeoPoint,
    destination: GeoPoint,
    context?: MapsRequestContext,
  ): Promise<number>;
  clusterMarkers(markers: MarkerClusterInput[]): Promise<MarkerClusterResult[]>;
}

export type MapsProviderConfig = ProviderConfig<MapsProviderName> & {
  paidCallsEnabled: boolean;
  cacheTtlSeconds: number;
  quotaPerMinute: number;
  fallbackProviders: readonly MapsProviderName[];
  circuitBreakerFailureThreshold: number;
  circuitBreakerCooldownMs: number;
};

export interface MapHealthEvent {
  provider: MapsProviderName;
  operation: string;
  responseTimeMs: number;
  quotaStatus: MapsQuotaStatus;
  failureCount: number;
  status: "success" | "failure" | "skipped";
  checkedAt: string;
  nextRetryAt?: string;
}
