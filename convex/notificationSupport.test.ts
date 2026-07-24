import { describe, expect, it } from "vitest";
import {
  isWithinQuietHours,
  normalizeNotificationDeepLink,
  notificationExternalUrl,
  notificationRetryDelayMs,
  validateNotificationContent,
  validateQuietHours,
} from "./notificationSupport";

describe("notification support", () => {
  it("allows only known internal deep links", () => {
    expect(normalizeNotificationDeepLink("/property/property-1?source=notification")).toBe(
      "/property/property-1?source=notification",
    );
    expect(normalizeNotificationDeepLink("/roommates/request-1")).toBe("/roommates/request-1");
    expect(() => normalizeNotificationDeepLink("https://evil.test/phish")).toThrow();
    expect(() => normalizeNotificationDeepLink("//evil.test/phish")).toThrow();
    expect(() => normalizeNotificationDeepLink("/property/%2e%2e/admin")).toThrow();
    expect(() => normalizeNotificationDeepLink("/unknown")).toThrow();
  });

  it("validates bounded notification content", () => {
    expect(
      validateNotificationContent({
        type: "property.interest.created",
        title: "New interest",
        body: "A user is interested in your property.",
        idempotencyKey: "interest:1:owner:2",
      }),
    ).toMatchObject({ type: "property.interest.created", title: "New interest" });
    expect(() =>
      validateNotificationContent({ type: "BAD TYPE", title: "x", body: "x", idempotencyKey: "x" }),
    ).toThrow();
  });

  it("handles daytime and overnight quiet hours", () => {
    const daytime = validateQuietHours({ timezone: "UTC", startMinutes: 60, endMinutes: 120 });
    const overnight = validateQuietHours({
      timezone: "UTC",
      startMinutes: 23 * 60,
      endMinutes: 60,
    });
    expect(isWithinQuietHours(Date.UTC(2026, 0, 1, 1, 30), daytime)).toBe(true);
    expect(isWithinQuietHours(Date.UTC(2026, 0, 1, 12), daytime)).toBe(false);
    expect(isWithinQuietHours(Date.UTC(2026, 0, 1, 23, 30), overnight)).toBe(true);
    expect(isWithinQuietHours(Date.UTC(2026, 0, 1, 12), overnight)).toBe(false);
    expect(() =>
      validateQuietHours({ timezone: "Invalid/Zone", startMinutes: 1, endMinutes: 2 }),
    ).toThrow();
  });

  it("uses bounded exponential retry delays", () => {
    expect(notificationRetryDelayMs(1)).toBe(60_000);
    expect(notificationRetryDelayMs(3)).toBe(240_000);
    expect(notificationRetryDelayMs(99)).toBe(21_600_000);
  });

  it("constructs only secure external notification URLs", () => {
    expect(notificationExternalUrl("https://saknaha.example", "/housing")).toBe(
      "https://saknaha.example/housing",
    );
    expect(() => notificationExternalUrl("http://saknaha.example", "/housing")).toThrow();
  });
});
