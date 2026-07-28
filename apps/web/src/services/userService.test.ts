import { beforeEach, describe, expect, it } from "vitest";
import { loginOwner, loginUser, registerOwner, registerUser } from "./userService";

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

describe("legacy local account service", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  it("does not create an account merely by attempting login", () => {
    expect(loginOwner("0500000000")).toBeNull();
    expect(loginUser("0500000000")).toBeNull();
  });

  it("preserves explicitly registered profiles", () => {
    const owner = registerOwner({
      fullName: "مالكة العقار",
      phone: "0500000000",
      ministryPropertyNumber: "1234567890",
    });
    const user = registerUser({
      name: "باحثة عن سكن",
      phone: "0500000000",
      role: "student",
      city: "الرياض",
      monthlyBudget: 2_500,
      acceptsRoommate: true,
    });
    expect(loginOwner("0500000000")?.id).toBe(owner.id);
    expect(loginUser("0500000000")?.id).toBe(user.id);
  });
});
