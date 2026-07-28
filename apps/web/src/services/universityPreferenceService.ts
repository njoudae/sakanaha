import { mockUniversities } from "@saknaha/constants/mockUniversities";
import type { UniversityLocation, User } from "@saknaha/shared-types";
import { getCurrentUser, updateUserUniversityPreference } from "./userService";

const SESSION_KEY = "saknaha.selectedUniversityBranch";

type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function getUniversityBranch(
  branchId?: string | null,
  branches: readonly UniversityLocation[] = mockUniversities,
): UniversityLocation | null {
  if (!branchId) return null;
  return branches.find((branch) => branch.active && branch.id === branchId) ?? null;
}

export function getSelectedUniversityBranch(
  user: User | null = getCurrentUser(),
  branches: readonly UniversityLocation[] = mockUniversities,
  storage?: PreferenceStorage,
): UniversityLocation | null {
  const userBranch = getUniversityBranch(user?.selectedUniversityBranchId, branches);
  if (userBranch) return userBranch;
  const session = storage ?? (typeof window === "undefined" ? undefined : window.sessionStorage);
  return getUniversityBranch(session?.getItem(SESSION_KEY), branches);
}

export function saveTemporaryUniversityBranch(
  branchId: string | null,
  storage?: PreferenceStorage,
): void {
  const session = storage ?? (typeof window === "undefined" ? undefined : window.sessionStorage);
  if (!session) return;
  if (branchId) session.setItem(SESSION_KEY, branchId);
  else session.removeItem(SESSION_KEY);
}

export function saveLocalUniversityPreference(
  user: User | null,
  branchId: string | null,
): User | null {
  saveTemporaryUniversityBranch(branchId);
  return user ? updateUserUniversityPreference(user.id, branchId) : null;
}
