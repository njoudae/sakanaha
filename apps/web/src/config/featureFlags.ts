export type FeatureFlagKey =
  | "auth.convexAuth.enabled"
  | "auth.google.enabled"
  | "auth.emailOtp.enabled"
  | "auth.phoneOtp.enabled"
  | "auth.apple.enabled"
  | "data.convex.enabled"
  | "data.localStorageExport.enabled"
  | "data.dualRead.enabled"
  | "data.dualWrite.enabled";

export type FeatureFlagMap = Readonly<Record<FeatureFlagKey, boolean>>;

export const defaultFeatureFlags: FeatureFlagMap = {
  "auth.convexAuth.enabled": false,
  "auth.google.enabled": false,
  "auth.emailOtp.enabled": false,
  "auth.phoneOtp.enabled": false,
  "auth.apple.enabled": false,
  "data.convex.enabled": false,
  "data.localStorageExport.enabled": true,
  "data.dualRead.enabled": false,
  "data.dualWrite.enabled": false,
};

function envFlag(name: string): boolean | undefined {
  const raw = import.meta.env[name];
  if (raw === undefined) return undefined;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function getFeatureFlags(): FeatureFlagMap {
  return {
    ...defaultFeatureFlags,
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
    "data.dualRead.enabled":
      envFlag("VITE_FEATURE_DATA_DUAL_READ_ENABLED") ??
      defaultFeatureFlags["data.dualRead.enabled"],
    "data.dualWrite.enabled":
      envFlag("VITE_FEATURE_DATA_DUAL_WRITE_ENABLED") ??
      defaultFeatureFlags["data.dualWrite.enabled"],
  };
}
