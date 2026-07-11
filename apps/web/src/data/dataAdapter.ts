import type { Owner, Property, User } from "@saknaha/shared-types";
import { getFeatureFlags, type FeatureFlagMap } from "../config/featureFlags";
import { createConvexClient } from "./convexClient";

export type DataSourceKind = "localStorage" | "convex";

export interface ReadOnlyDataAdapter {
  readonly kind: DataSourceKind;
  getCurrentOwner(): Owner | null;
  getCurrentUser(): User | null;
  getProperties(): Property[];
  getPublishedProperties(): Property[];
}

export interface ConvexDataBoundary {
  readonly kind: "convex";
  readonly client: ReturnType<typeof createConvexClient>;
}

export function resolveDataSource(flags: FeatureFlagMap = getFeatureFlags()): DataSourceKind {
  return flags["data.convex.enabled"] ? "convex" : "localStorage";
}

export function createConvexDataBoundary(
  flags: FeatureFlagMap = getFeatureFlags(),
): ConvexDataBoundary | null {
  if (resolveDataSource(flags) !== "convex") return null;
  return {
    kind: "convex",
    client: createConvexClient(flags),
  };
}
