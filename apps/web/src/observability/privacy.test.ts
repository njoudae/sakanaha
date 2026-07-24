import { describe, expect, it } from "vitest";
import {
  isAllowedAnalyticsEvent,
  normalizeAnalyticsRoute,
  redactTelemetryText,
  sanitizeAnalyticsProperties,
} from "./privacy";

describe("observability privacy", () => {
  it("templates entity routes and removes query strings", () => {
    expect(normalizeAnalyticsRoute("/property/private-id?token=secret")).toBe("/property/:id");
    expect(normalizeAnalyticsRoute("/roommates/request-id")).toBe("/roommates/:id");
    expect(normalizeAnalyticsRoute("/unknown/private-value")).toBe("/other");
  });

  it("redacts common PII and secrets", () => {
    expect(redactTelemetryText("user@example.com +966501234567 ?token=abc")).toBe(
      "[redacted-email] [redacted-phone] ?token=[redacted]",
    );
  });

  it("allows only bounded, approved analytics properties", () => {
    expect(
      sanitizeAnalyticsProperties({
        route: "/housing",
        duration_ms: 120,
        email: "user@example.com",
        arbitrary: "private",
        count: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({ route: "/housing", duration_ms: 120 });
  });

  it("allows only stable event names", () => {
    expect(isAllowedAnalyticsEvent("page_view")).toBe(true);
    expect(isAllowedAnalyticsEvent("user@example.com")).toBe(false);
  });
});
