import { beforeEach, describe, expect, it } from "vitest";
import type { Property } from "@saknaha/shared-types";
import { addRoommateRequest, saveProperty } from "./propertyService";
import {
  getAllOwners,
  getAllUsers,
  isAutomaticApprovalAccount,
  loginOwner,
  loginUser,
  PRIMARY_ACCOUNT_PHONE,
  registerOwner,
  registerUser,
} from "./userService";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("primary mobile account", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  it("creates independent owner and seeker accounts for the same number", () => {
    const owner = loginOwner(PRIMARY_ACCOUNT_PHONE);
    const user = loginUser(PRIMARY_ACCOUNT_PHONE);

    expect(owner?.phone).toBe(PRIMARY_ACCOUNT_PHONE);
    expect(user?.phone).toBe(PRIMARY_ACCOUNT_PHONE);
    expect(owner?.id).not.toBe(user?.id);
    expect(getAllOwners()).toHaveLength(1);
    expect(getAllUsers()).toHaveLength(1);
  });

  it("preserves profiles that were already registered for the number", () => {
    const owner = registerOwner({
      fullName: "مالكة العقار",
      phone: PRIMARY_ACCOUNT_PHONE,
      ministryPropertyNumber: "1234567890",
    });
    const user = registerUser({
      name: "باحثة عن سكن",
      phone: PRIMARY_ACCOUNT_PHONE,
      role: "student",
      city: "الرياض",
      monthlyBudget: 2_500,
      acceptsRoommate: true,
    });

    expect(loginOwner(PRIMARY_ACCOUNT_PHONE)?.id).toBe(owner.id);
    expect(loginUser(PRIMARY_ACCOUNT_PHONE)?.id).toBe(user.id);
    expect(loginOwner(PRIMARY_ACCOUNT_PHONE)?.fullName).toBe("مالكة العقار");
    expect(loginUser(PRIMARY_ACCOUNT_PHONE)?.name).toBe("باحثة عن سكن");
  });

  it("recognizes the direct-approval account in local and international formats", () => {
    expect(isAutomaticApprovalAccount("0582968140")).toBe(true);
    expect(isAutomaticApprovalAccount("+966 58 296 8140")).toBe(true);
    expect(isAutomaticApprovalAccount("0582968141")).toBe(false);
  });

  it("publishes this account's property and roommate card without moderation", () => {
    const owner = loginOwner(PRIMARY_ACCOUNT_PHONE);
    const user = loginUser(PRIMARY_ACCOUNT_PHONE);
    expect(owner).not.toBeNull();
    expect(user).not.toBeNull();

    const property = saveProperty({
      id: "direct-property",
      ownerId: owner!.id,
      ownerName: owner!.fullName,
      ownerPhone: owner!.phone,
      title: "Direct property",
      propertyLicenseNumber: "AUTO-LOCAL",
      city: "Abha",
      neighborhood: "Al Manhal",
      address: "Abha",
      universityNearby: "King Khalid University",
      googleMapsUrl: "",
      classification: "متاح للجميع",
      propertyType: "شقة",
      minRooms: 1,
      maxRooms: 1,
      floorsCount: 1,
      hasElevator: false,
      hasCleaningWorker: false,
      hasTransportService: false,
      universityBusPasses: false,
      bathrooms: 1,
      furnished: true,
      maxResidents: 1,
      roommateAllowed: true,
      price: 2000,
      paymentType: "شهري",
      negotiable: false,
      allowWhatsappContact: true,
      services: [],
      images: ["data:image/jpeg;base64,test"],
      status: "pending_review",
      publicationStatus: "pending_review",
      distanceText: "",
      timeText: "",
      createdAt: new Date().toISOString(),
    } satisfies Property);
    const card = addRoommateRequest({
      propertyId: property.id,
      userId: user!.id,
      userType: "student",
      age: 22,
      organization: "King Khalid University",
      moveInDate: "2026-09-01",
      bio: "Looking for a roommate",
      availableRooms: 1,
      publicationStatus: "pending_review",
    });

    expect(property).toMatchObject({
      status: "published",
      publicationStatus: "approved",
    });
    expect(card.publicationStatus).toBe("approved");
    expect(card.reviewedAt).toBeTruthy();
  });
});
