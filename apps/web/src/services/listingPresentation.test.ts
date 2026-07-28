import { describe, expect, it } from "vitest";
import type { Property, RoommateRequest } from "@saknaha/shared-types";
import {
  getPropertyCardPresentation,
  getRoommatePricePerPerson,
  getRoommateRequesterName,
} from "./listingPresentation";

const property: Property = {
  id: "property-1",
  ownerId: "owner-1",
  ownerName: "مالكة السكن",
  ownerPhone: "test-owner-phone",
  title: "غرفة قريبة من الجامعة",
  propertyLicenseNumber: "license-1",
  city: "أبها",
  neighborhood: "المنسك",
  address: "عنوان تقريبي",
  universityNearby: "جامعة الملك خالد",
  googleMapsUrl: "",
  classification: "نسائي بالكامل",
  propertyType: "غرفة",
  minRooms: 1,
  maxRooms: 1,
  floorsCount: 1,
  hasElevator: false,
  hasCleaningWorker: false,
  hasTransportService: false,
  universityBusPasses: false,
  bathrooms: 1,
  furnished: true,
  maxResidents: 2,
  availableUnits: 1,
  roommateAllowed: true,
  price: 1_800,
  paymentType: "سنوي",
  negotiable: false,
  allowWhatsappContact: false,
  services: [],
  images: [],
  status: "published",
  publicationStatus: "approved",
  distanceText: "",
  timeText: "",
  createdAt: "2026-07-26T00:00:00.000Z",
};

const roommateRequest: RoommateRequest = {
  id: "request-1",
  propertyId: property.id,
  userId: "user-1",
  requesterName: "  نورة  ",
  userType: "student",
  age: 22,
  organization: "جامعة الملك خالد",
  moveInDate: "سبتمبر 2026",
  bio: "أبحث عن شريكة سكن.",
  availableRooms: 1,
  pricePerPerson: 725,
  createdAt: "2026-07-26T00:00:00.000Z",
};

describe("listing presentation", () => {
  it("uses the real property type, price, and payment period", () => {
    expect(getPropertyCardPresentation(property)).toMatchObject({
      type: "غرفة",
      price: 1_800,
      pricePeriod: "سنة",
      title: property.title,
      availability: "nearlyFull",
    });
  });

  it("prefers the roommate card price over a derived estimate", () => {
    expect(getRoommatePricePerPerson(roommateRequest, property)).toBe(725);
  });

  it("uses a neutral fallback instead of demo identities", () => {
    expect(getRoommateRequesterName(roommateRequest)).toBe("نورة");
    expect(getRoommateRequesterName({ ...roommateRequest, requesterName: " " })).toBe(
      "باحثة عن شريكة سكن",
    );
  });
});
