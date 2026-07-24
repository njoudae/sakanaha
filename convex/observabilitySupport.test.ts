import { describe, expect, it } from "vitest";
import {
  normalizeAuditAction,
  normalizeUsageEventName,
  normalizeUsageRoute,
  sanitizeAuditMetadata,
  sanitizeUsageProperties,
} from "./observabilitySupport";

describe("server observability privacy", () => {
  it("accepts only stable event and audit names", () => {
    expect(normalizeUsageEventName("property_viewed")).toBe("property_viewed");
    expect(normalizeAuditAction("property.status.changed")).toBe("property.status.changed");
    expect(() => normalizeUsageEventName("user@example.com")).toThrow();
    expect(() => normalizeAuditAction("INVALID ACTION")).toThrow();
  });

  it("templates routes before storage", () => {
    expect(normalizeUsageRoute("/property/private-id?source=email")).toBe("/property/:id");
    expect(normalizeUsageRoute("/unrecognized/private-id")).toBe("/other");
  });

  it("drops sensitive analytics and audit metadata", () => {
    expect(
      sanitizeUsageProperties({ route: "/housing", count: 2, email: "user@example.com" }),
    ).toEqual({ route: "/housing", count: 2 });
    expect(
      sanitizeAuditMetadata({ status: "published", token: "secret", phone: "+966500000000" }),
    ).toEqual({ status: "published" });
  });
});
