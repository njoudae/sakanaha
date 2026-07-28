import { ConvexReactClient } from "convex/react";
import type { FeatureFlagMap } from "../config/featureFlags";
import { getFeatureFlags } from "../config/featureFlags";

export function getConvexUrl(): string | null {
  return import.meta.env.VITE_CONVEX_URL || null;
}

export function shouldUseConvexData(flags: FeatureFlagMap = getFeatureFlags()): boolean {
  return flags["data.convex.enabled"];
}

export function shouldUseConvexAuth(flags: FeatureFlagMap = getFeatureFlags()): boolean {
  return flags["auth.convexAuth.enabled"];
}

export function createConvexClient(
  flags: FeatureFlagMap = getFeatureFlags(),
): ConvexReactClient | null {
  if (!shouldUseConvexData(flags)) return null;

  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is required when data.convex.enabled is true.");
  }

  return new ConvexReactClient(convexUrl);
}

export function createConvexAuthClient(
  flags: FeatureFlagMap = getFeatureFlags(),
): ConvexReactClient | null {
  if (!shouldUseConvexAuth(flags)) return null;

  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is required when auth.convexAuth.enabled is true.");
  }

  return new ConvexReactClient(convexUrl);
}
