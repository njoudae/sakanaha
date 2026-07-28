export type FeatureFlagKey =
  | "auth.identityFoundation.enabled"
  | "auth.convexAuth.enabled"
  | "auth.google.enabled"
  | "auth.emailOtp.enabled"
  | "auth.phoneOtp.enabled"
  | "auth.apple.enabled"
  | "data.convex.enabled"
  | "maps.universityDirections.enabled";

export type FeatureFlagMap = Readonly<Record<FeatureFlagKey, boolean>>;

export const defaultFeatureFlags: FeatureFlagMap = {
  "auth.identityFoundation.enabled": true,
  "auth.convexAuth.enabled": false,
  "auth.google.enabled": false,
  "auth.emailOtp.enabled": false,
  "auth.phoneOtp.enabled": false,
  "auth.apple.enabled": false,
  "data.convex.enabled": true,
  "maps.universityDirections.enabled": true,
};

function envFlag(name: string): boolean | undefined {
  const raw = import.meta.env[name];
  if (raw === undefined) return undefined;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function getFeatureFlags(): FeatureFlagMap {
  return {
    ...defaultFeatureFlags,
    "auth.identityFoundation.enabled":
      envFlag("VITE_FEATURE_AUTH_IDENTITY_FOUNDATION_ENABLED") ??
      defaultFeatureFlags["auth.identityFoundation.enabled"],
    "auth.convexAuth.enabled":
      envFlag("VITE_FEATURE_AUTH_CONVEX_AUTH_ENABLED") ??
      defaultFeatureFlags["auth.convexAuth.enabled"],
    "auth.google.enabled":
      envFlag("VITE_FEATURE_AUTH_GOOGLE_ENABLED") ?? defaultFeatureFlags["auth.google.enabled"],
    "auth.emailOtp.enabled":
      envFlag("VITE_FEATURE_AUTH_EMAIL_OTP_ENABLED") ??
      defaultFeatureFlags["auth.emailOtp.enabled"],
    "auth.phoneOtp.enabled":
      envFlag("VITE_FEATURE_AUTH_PHONE_OTP_ENABLED") ??
      defaultFeatureFlags["auth.phoneOtp.enabled"],
    "auth.apple.enabled": false,
    "data.convex.enabled":
      envFlag("VITE_FEATURE_DATA_CONVEX_ENABLED") ?? defaultFeatureFlags["data.convex.enabled"],
    "maps.universityDirections.enabled":
      envFlag("VITE_FEATURE_MAPS_UNIVERSITY_DIRECTIONS_ENABLED") ??
      defaultFeatureFlags["maps.universityDirections.enabled"],
  };
}
