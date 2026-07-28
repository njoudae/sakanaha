import { describe, expect, it } from "vitest";
import type { Property, RoommateRequest, User } from "@saknaha/shared-types";
import { defaultRoommatePreferences } from "./roommatePreferenceDefaults";
import { calculateRoommateCompatibility } from "./roommateCompatibility";

describe("calculateRoommateCompatibility", () => {
  it("normalizes the documented 108 weighted points to 100 percent", () => {
    const property = {
      city: "أبها",
      neighborhood: "قريقر",
      propertyType: "شقة",
      price: 1200,
      lat: 18.24,
      lng: 42.51,
    } as Property;
    const card = {
      pricePerPerson: 1200,
      preferences: defaultRoommatePreferences,
    } as RoommateRequest;
    const user = { city: "أبها", role: "student" } as User;
    const result = calculateRoommateCompatibility({
      property,
      card,
      applicant: user,
      applicantPreferences: { ...defaultRoommatePreferences, occupation: "student" },
      preferredNeighborhood: "قريقر",
      preferredPropertyType: "شقة",
      preferredMonthlyBudget: 1500,
      applicantCoordinates: { lat: 18.24, lng: 42.51 },
    });
    expect(result.score).toBe(100);
  });

  it("returns differences for incompatible preferences", () => {
    const result = calculateRoommateCompatibility({
      property: {
        city: "أبها",
        neighborhood: "المنسك",
        propertyType: "شقة",
        price: 2000,
      } as Property,
      card: {
        pricePerPerson: 2000,
        preferences: defaultRoommatePreferences,
      } as RoommateRequest,
      applicant: { city: "الرياض", role: "employee" } as User,
      applicantPreferences: {
        ...defaultRoommatePreferences,
        smoking: "yes",
        pets: "allowed",
      },
      preferredNeighborhood: "الياسمين",
      preferredPropertyType: "دور",
      preferredMonthlyBudget: 1000,
    });
    expect(result.score).toBeLessThan(50);
    expect(result.differenceReasons.length).toBeGreaterThan(0);
  });
});
