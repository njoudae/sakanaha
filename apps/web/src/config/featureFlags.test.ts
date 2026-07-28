import { afterEach, describe, expect, it, vi } from "vitest";
import { getFeatureFlags } from "./featureFlags";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authentication feature flags", () => {
  it("keeps Convex as the production business data source", () => {
    vi.stubEnv("PROD", true);
    expect(getFeatureFlags()["data.convex.enabled"]).toBe(true);
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
