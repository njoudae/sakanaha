import { describe, expect, it } from "vitest";
import { createProviderConfiguration } from "./providerConfig";
import { ProviderConfigurationError, resolveProvider } from "./providerResolver";

describe("provider configuration", () => {
  it("uses production-safe defaults", () => {
    const config = createProviderConfiguration();

    expect(config.maps.provider).toBe("google");
    expect(config.maps.paidCallsEnabled).toBe(false);
    expect(config.maps.fallbackProviders).toEqual(["mapbox", "openstreetmap"]);
    expect(config.maps.circuitBreakerFailureThreshold).toBe(3);
    expect(config.sms.provider).toBe("msegat");
    expect(config.sms.status).toBe("disabled");
    expect(config.sms.emergencyKillSwitch).toBe(false);
    expect(config.sms.fallbackProviders).toEqual(["taqny", "twilio"]);
    expect(config.sms.hourlyLimit).toBe(100);
    expect(config.sms.dailyLimit).toBe(500);
    expect(config.sms.perUserHourlyLimit).toBe(5);
    expect(config.sms.perUserDailyLimit).toBe(20);
    expect(config.sms.perIpHourlyLimit).toBe(20);
    expect(config.sms.perIpDailyLimit).toBe(100);
    expect(config.sms.destinationAccountHourlyLimit).toBe(3);
    expect(config.sms.estimatedCostByProvider.msegat).toBe(0.03);
    expect(config.analytics.provider).toBe("disabled");
    expect(config.monitoring.provider).toBe("disabled");
    expect(config.storage.provider).toBe("convex");
    expect(config.cost.provider).toBe("convex");
  });

  it("resolves configured providers from a registry", () => {
    const adapter = { provider: "twilio" as const };
    const resolved = resolveProvider(
      { provider: "twilio", status: "enabled" },
      { twilio: adapter },
    );

    expect(resolved).toBe(adapter);
  });

  it("applies the SMS emergency kill switch even when SMS is enabled", () => {
    const config = createProviderConfiguration({
      SAKNAHA_SMS_ENABLED: "true",
      SAKNAHA_SMS_EMERGENCY_DISABLED: "true",
    });

    expect(config.sms.status).toBe("disabled");
    expect(config.sms.emergencyKillSwitch).toBe(true);
  });

  it("parses configured SMS fallback providers without repeating the primary", () => {
    const config = createProviderConfiguration({
      SAKNAHA_SMS_PROVIDER: "taqny",
      SAKNAHA_SMS_FALLBACK_PROVIDERS: "msegat,twilio,taqny",
    });

    expect(config.sms.fallbackProviders).toEqual(["msegat", "twilio"]);
  });

  it("returns null for disabled providers", () => {
    const resolved = resolveProvider({ provider: "disabled", status: "disabled" }, {});

    expect(resolved).toBeNull();
  });

  it("rejects enabled providers without registered adapters", () => {
    expect(() => resolveProvider({ provider: "google", status: "enabled" }, {})).toThrow(
      ProviderConfigurationError,
    );
  });
});
