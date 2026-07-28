import { afterEach, describe, expect, it, vi } from "vitest";
import { getFeatureFlags } from "./featureFlags";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authentication feature flags", () => {
  it("cannot enable legacy local authentication in production", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_FEATURE_AUTH_LOCAL_LEGACY_ENABLED", "true");
    expect(getFeatureFlags()["auth.localLegacy.enabled"]).toBe(false);
  });

  it("keeps production-provider switches disabled by default", () => {
    vi.stubEnv("PROD", true);
    expect(getFeatureFlags()).toMatchObject({
      "auth.identityFoundation.enabled": true,
      "auth.convexAuth.enabled": false,
      "auth.google.enabled": false,
      "auth.emailOtp.enabled": false,
      "auth.phoneOtp.enabled": false,
    });
  });
});
