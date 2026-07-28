import { describe, expect, it } from "vitest";
import { formatRentalPrices, getRentalPrices, normalizeRentalPrices } from "./propertyFormat";

describe("rental-period pricing", () => {
  it("preserves a legacy monthly price", () => {
    const property = { price: 2000, paymentType: "شهري" as const };
    expect(getRentalPrices(property)).toEqual([{ period: "monthly", price: 2000 }]);
    expect(normalizeRentalPrices(property)).toEqual({ monthly: 2000 });
  });

  it("returns every configured period in display order", () => {
    const property = {
      price: 2000,
      paymentType: "شهري" as const,
      rentalPrices: { yearly: 18000, daily: 150, monthly: 2000 },
    };
    expect(getRentalPrices(property)).toEqual([
      { period: "daily", price: 150 },
      { period: "monthly", price: 2000 },
      { period: "yearly", price: 18000 },
    ]);
    expect(formatRentalPrices(property)).toContain("سنوي");
  });

  it("ignores invalid configured prices", () => {
    const property = {
      price: 500,
      paymentType: "سنوي" as const,
      rentalPrices: { daily: 0, weekly: -1, yearly: 6000 },
    };
    expect(getRentalPrices(property)).toEqual([{ period: "yearly", price: 6000 }]);
  });
});
