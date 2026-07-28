import type { Owner, RoommateLifestylePreferences, User } from "@saknaha/shared-types";
import { makeId, readStorage, writeStorage } from "./storage";

const OWNER_KEY = "saknaha.owners";
const USER_KEY = "saknaha.users";
const CURRENT_OWNER_KEY = "saknaha.currentOwner";
const CURRENT_USER_KEY = "saknaha.currentUser";
const PUBLIC_CODE_COUNTER_KEY = "saknaha.publicCodeCounter";
export const PRIMARY_ACCOUNT_PHONE = "0582968140";
export const DEVELOPMENT_ADMIN_PHONE = "0582968141";
const DEVELOPMENT_ADMIN_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEVELOPMENT_ADMIN === "true";

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, "");
}

export function isAutomaticApprovalAccount(phone: string | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  const localPhone = digits.startsWith("966")
    ? `0${digits.slice(3)}`
    : digits.length === 9 && digits.startsWith("5")
      ? `0${digits}`
      : digits;
  return localPhone === PRIMARY_ACCOUNT_PHONE;
}

function nextPublicCode(): string {
  const next = Math.max(1, readStorage<number>(PUBLIC_CODE_COUNTER_KEY, 0) + 1);
  writeStorage(PUBLIC_CODE_COUNTER_KEY, next);
  return `SK-${String(next).padStart(6, "0")}`;
}

function publicCodeForPhone(phone: string): string {
  const normalizedPhone = normalizePhone(phone);
  const ownerCode = readStorage<Owner[]>(OWNER_KEY, []).find(
    (item) => normalizePhone(item.phone) === normalizedPhone && item.publicCode,
  )?.publicCode;
  const userCode = readStorage<User[]>(USER_KEY, []).find(
    (item) => normalizePhone(item.phone) === normalizedPhone && item.publicCode,
  )?.publicCode;
  return ownerCode ?? userCode ?? nextPublicCode();
}

function withOwnerPublicCode(owner: Owner): Owner {
  return owner.publicCode ? owner : { ...owner, publicCode: publicCodeForPhone(owner.phone) };
}

function withUserPublicCode(user: User): User {
  return user.publicCode ? user : { ...user, publicCode: publicCodeForPhone(user.phone) };
}

function removeLegacyTestAccounts() {
  const owners = readStorage<Owner[]>(OWNER_KEY, []);
  const realOwners = owners.filter(
    (owner) => owner.ministryPropertyNumber !== "TEST-OWNER-0582968140",
  );
  if (realOwners.length !== owners.length) {
    writeStorage(OWNER_KEY, realOwners);
    const currentOwner = readStorage<Owner | null>(CURRENT_OWNER_KEY, null);
    if (currentOwner?.ministryPropertyNumber === "TEST-OWNER-0582968140") {
      localStorage.removeItem(CURRENT_OWNER_KEY);
    }
  }

  const users = readStorage<User[]>(USER_KEY, []);
  const realUsers = users.filter((user) => user.name !== "نجود - حساب اختبار الطالبة");
  if (realUsers.length !== users.length) {
    writeStorage(USER_KEY, realUsers);
    const currentUser = readStorage<User | null>(CURRENT_USER_KEY, null);
    if (currentUser?.name === "نجود - حساب اختبار الطالبة") {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }
}

function ensurePrimaryOwner(): Owner {
  const owners = readStorage<Owner[]>(OWNER_KEY, []);
  const existing = owners.find((owner) => normalizePhone(owner.phone) === PRIMARY_ACCOUNT_PHONE);
  if (existing) {
    const normalized = withOwnerPublicCode(existing);
    if (normalized !== existing) {
      writeStorage(
        OWNER_KEY,
        owners.map((item) => (item.id === existing.id ? normalized : item)),
      );
    }
    return normalized;
  }

  const owner = withOwnerPublicCode({
    id: makeId("owner"),
    fullName: "نجود",
    phone: PRIMARY_ACCOUNT_PHONE,
    ministryPropertyNumber: "",
    createdAt: new Date().toISOString(),
  });
  writeStorage(OWNER_KEY, [owner, ...owners]);
  return owner;
}

function ensurePrimaryUser(): User {
  const users = readStorage<User[]>(USER_KEY, []);
  const existing = users.find((user) => normalizePhone(user.phone) === PRIMARY_ACCOUNT_PHONE);
  if (existing) {
    const normalized = withUserPublicCode(existing);
    if (normalized !== existing) {
      writeStorage(
        USER_KEY,
        users.map((item) => (item.id === existing.id ? normalized : item)),
      );
    }
    return normalized;
  }

  const user = withUserPublicCode({
    id: makeId("user"),
    name: "نجود",
    phone: PRIMARY_ACCOUNT_PHONE,
    role: "student",
    city: "أبها",
    monthlyBudget: 0,
    acceptsRoommate: true,
    createdAt: new Date().toISOString(),
  });
  writeStorage(USER_KEY, [user, ...users]);
  return user;
}

function ensureDevelopmentAdmin(): User {
  const users = readStorage<User[]>(USER_KEY, []);
  const existing = users.find((item) => normalizePhone(item.phone) === DEVELOPMENT_ADMIN_PHONE);
  const admin = withUserPublicCode({
    ...(existing ?? {
      id: makeId("admin"),
      phone: DEVELOPMENT_ADMIN_PHONE,
      createdAt: new Date().toISOString(),
    }),
    name: "مدير سكنها - حساب التطوير",
    role: "employee",
    platformRole: "admin",
    city: "الرياض",
    monthlyBudget: 0,
    acceptsRoommate: false,
  });
  const nextUsers = users.some((item) => item.id === admin.id)
    ? users.map((item) => (item.id === admin.id ? admin : item))
    : [admin, ...users];
  writeStorage(USER_KEY, nextUsers);
  writeStorage(CURRENT_USER_KEY, admin);
  return admin;
}

export function registerOwner(input: Omit<Owner, "id" | "createdAt">): Owner {
  const owner = withOwnerPublicCode({
    ...input,
    id: makeId("owner"),
    createdAt: new Date().toISOString(),
  });
  const owners = readStorage<Owner[]>(OWNER_KEY, []);
  const nextOwners = owners.some((item) => item.phone === owner.phone)
    ? owners.map((item) => (item.phone === owner.phone ? owner : item))
    : [owner, ...owners];
  writeStorage(OWNER_KEY, nextOwners);
  writeStorage(CURRENT_OWNER_KEY, owner);
  return owner;
}

export function getCurrentOwner(): Owner | null {
  removeLegacyTestAccounts();
  const current = readStorage<Owner | null>(CURRENT_OWNER_KEY, null);
  if (!current) return null;
  const normalized = withOwnerPublicCode(current);
  if (normalized !== current) {
    writeStorage(CURRENT_OWNER_KEY, normalized);
    const owners = readStorage<Owner[]>(OWNER_KEY, []);
    writeStorage(
      OWNER_KEY,
      owners.some((item) => item.id === normalized.id)
        ? owners.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...owners],
    );
  }
  return normalized;
}

export function getAllOwners(): Owner[] {
  removeLegacyTestAccounts();
  const owners = readStorage<Owner[]>(OWNER_KEY, []);
  const normalized = owners.map(withOwnerPublicCode);
  writeStorage(OWNER_KEY, normalized);
  return normalized;
}

export function loginOwner(phone: string): Owner | null {
  removeLegacyTestAccounts();
  const normalizedPhone = normalizePhone(phone);
  const owner =
    normalizedPhone === PRIMARY_ACCOUNT_PHONE
      ? ensurePrimaryOwner()
      : readStorage<Owner[]>(OWNER_KEY, []).find(
          (item) => normalizePhone(item.phone) === normalizedPhone,
        );
  if (!owner) return null;
  const normalized = withOwnerPublicCode(owner);
  const owners = readStorage<Owner[]>(OWNER_KEY, []);
  writeStorage(
    OWNER_KEY,
    owners.map((item) => (item.id === normalized.id ? normalized : item)),
  );
  writeStorage(CURRENT_OWNER_KEY, normalized);
  return normalized;
}

export function logoutOwner(): void {
  localStorage.removeItem(CURRENT_OWNER_KEY);
}

export function logoutUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function registerUser(input: Omit<User, "id" | "createdAt">): User {
  const user = withUserPublicCode({
    ...input,
    id: makeId("user"),
    createdAt: new Date().toISOString(),
  });
  const users = readStorage<User[]>(USER_KEY, []);
  const nextUsers = users.some((item) => item.phone === user.phone)
    ? users.map((item) => (item.phone === user.phone ? user : item))
    : [user, ...users];
  writeStorage(USER_KEY, nextUsers);
  writeStorage(CURRENT_USER_KEY, user);
  return user;
}

export function getCurrentUser(): User | null {
  removeLegacyTestAccounts();
  const current = readStorage<User | null>(CURRENT_USER_KEY, null);
  if (!current) return null;
  const normalized = withUserPublicCode(current);
  if (normalized !== current) {
    writeStorage(CURRENT_USER_KEY, normalized);
    const users = readStorage<User[]>(USER_KEY, []);
    writeStorage(
      USER_KEY,
      users.some((item) => item.id === normalized.id)
        ? users.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...users],
    );
  }
  return normalized;
}

export function getAllUsers(): User[] {
  removeLegacyTestAccounts();
  const users = readStorage<User[]>(USER_KEY, []);
  const normalized = users.map(withUserPublicCode);
  writeStorage(USER_KEY, normalized);
  return normalized;
}

export function updateUserProfile(userId: string, input: Pick<User, "name" | "city">): User | null {
  const users = readStorage<User[]>(USER_KEY, []);
  const currentUser = getCurrentUser();
  const existing = users.find((item) => item.id === userId) ?? currentUser;
  if (!existing || existing.id !== userId) return null;

  const updated: User = {
    ...existing,
    name: input.name.trim(),
    city: input.city,
  };
  const nextUsers = users.some((item) => item.id === userId)
    ? users.map((item) => (item.id === userId ? updated : item))
    : [updated, ...users];
  writeStorage(USER_KEY, nextUsers);
  writeStorage(CURRENT_USER_KEY, updated);
  return updated;
}

export function updateUserUniversityPreference(
  userId: string,
  selectedUniversityBranchId: string | null,
): User | null {
  const users = readStorage<User[]>(USER_KEY, []);
  const currentUser = getCurrentUser();
  const existing = users.find((item) => item.id === userId) ?? currentUser;
  if (!existing || existing.id !== userId) return null;

  const updated: User = {
    ...existing,
    selectedUniversityBranchId: selectedUniversityBranchId ?? undefined,
  };
  const nextUsers = users.some((item) => item.id === userId)
    ? users.map((item) => (item.id === userId ? updated : item))
    : [updated, ...users];
  writeStorage(USER_KEY, nextUsers);
  writeStorage(CURRENT_USER_KEY, updated);
  return updated;
}

export function updateUserRoommatePreferences(
  userId: string,
  roommatePreferences: RoommateLifestylePreferences,
): User | null {
  const users = readStorage<User[]>(USER_KEY, []);
  const currentUser = getCurrentUser();
  const existing = users.find((item) => item.id === userId) ?? currentUser;
  if (!existing || existing.id !== userId) return null;

  const updated: User = { ...existing, roommatePreferences };
  const nextUsers = users.some((item) => item.id === userId)
    ? users.map((item) => (item.id === userId ? updated : item))
    : [updated, ...users];
  writeStorage(USER_KEY, nextUsers);
  writeStorage(CURRENT_USER_KEY, updated);
  return updated;
}

export function loginUser(phone: string): User | null {
  removeLegacyTestAccounts();
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone === DEVELOPMENT_ADMIN_PHONE && DEVELOPMENT_ADMIN_ENABLED) {
    return ensureDevelopmentAdmin();
  }
  const user =
    normalizedPhone === PRIMARY_ACCOUNT_PHONE
      ? ensurePrimaryUser()
      : readStorage<User[]>(USER_KEY, []).find(
          (item) => normalizePhone(item.phone) === normalizedPhone,
        );
  if (!user) return null;
  const normalized = withUserPublicCode(user);
  const users = readStorage<User[]>(USER_KEY, []);
  writeStorage(
    USER_KEY,
    users.map((item) => (item.id === normalized.id ? normalized : item)),
  );
  writeStorage(CURRENT_USER_KEY, normalized);
  return normalized;
}
