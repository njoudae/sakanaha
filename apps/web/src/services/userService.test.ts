import { beforeEach, describe, expect, it } from "vitest";
import {
  getAllOwners,
  getAllUsers,
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
});
