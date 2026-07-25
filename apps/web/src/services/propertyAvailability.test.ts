import { describe, expect, it } from "vitest";
import {
  getAvailabilityStatus,
  getAvailableUnits,
  withNormalizedInventory,
} from "./propertyAvailability";
import type { Property } from "@saknaha/shared-types";

const inventory = {
  maxResidents: 8,
  totalUnits: 8,
};

describe("property availability", () => {
  it("derives available, nearly full, and full from remaining units", () => {
    expect(getAvailabilityStatus({ ...inventory, availableUnits: 8 })).toBe("available");
    expect(getAvailabilityStatus({ ...inventory, availableUnits: 2 })).toBe("nearly_full");
    expect(getAvailabilityStatus({ ...inventory, availableUnits: 0 })).toBe("full");
  });

  it("clamps invalid remaining units", () => {
    expect(getAvailableUnits({ ...inventory, availableUnits: 20 })).toBe(8);
    expect(getAvailableUnits({ ...inventory, availableUnits: -2 })).toBe(0);
  });

  it("keeps older properties backward compatible", () => {
    const property = { maxResidents: 3 } as Property;
    expect(withNormalizedInventory(property)).toMatchObject({
      totalUnits: 3,
      availableUnits: 3,
      availabilityStatus: "available",
    });
  });
});
