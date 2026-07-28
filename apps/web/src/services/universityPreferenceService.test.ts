import { describe, expect, it } from "vitest";
import { mockUniversities } from "@saknaha/constants/mockUniversities";
import type { User } from "@saknaha/shared-types";
import {
  getSelectedUniversityBranch,
  saveTemporaryUniversityBranch,
} from "./universityPreferenceService";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe("university campus persistence", () => {
  it("restores a guest campus from session storage", () => {
    const storage = memoryStorage();
    saveTemporaryUniversityBranch("kku-faraa", storage);
    expect(getSelectedUniversityBranch(null, mockUniversities, storage)?.id).toBe("kku-faraa");
  });

  it("prefers an authenticated user's persisted campus over a guest session", () => {
    const storage = memoryStorage();
    saveTemporaryUniversityBranch("kku-faraa", storage);
    const user = { selectedUniversityBranchId: "kku-king-road" } as User;
    expect(getSelectedUniversityBranch(user, mockUniversities, storage)?.id).toBe("kku-king-road");
  });

  it("does not restore inactive or unknown campuses", () => {
    const storage = memoryStorage();
    saveTemporaryUniversityBranch("missing-branch", storage);
    expect(getSelectedUniversityBranch(null, mockUniversities, storage)).toBeNull();
  });
});
