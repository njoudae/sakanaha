import type { Owner, User } from "@saknaha/shared-types";
import { makeId, readStorage, writeStorage } from "./storage";

const OWNER_KEY = "saknaha.owners";
const USER_KEY = "saknaha.users";
const CURRENT_OWNER_KEY = "saknaha.currentOwner";
const CURRENT_USER_KEY = "saknaha.currentUser";
const TEST_PHONE = "0582968140";

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, "");
}

function ensureTestOwner(): Owner {
  const owners = readStorage<Owner[]>(OWNER_KEY, []);
  const existing = owners.find((item) => normalizePhone(item.phone) === TEST_PHONE);
  if (existing) {
    writeStorage(CURRENT_OWNER_KEY, existing);
    return existing;
  }

  const owner: Owner = {
    id: makeId("owner"),
    fullName: "نجود - حساب اختبار المالك",
    phone: TEST_PHONE,
    ministryPropertyNumber: "TEST-OWNER-0582968140",
    createdAt: new Date().toISOString(),
  };
  writeStorage(OWNER_KEY, [owner, ...owners]);
  writeStorage(CURRENT_OWNER_KEY, owner);
  return owner;
}

function ensureTestUser(): User {
  const users = readStorage<User[]>(USER_KEY, []);
  const existing = users.find((item) => normalizePhone(item.phone) === TEST_PHONE);
  if (existing) {
    writeStorage(CURRENT_USER_KEY, existing);
    return existing;
  }

  const user: User = {
    id: makeId("user"),
    name: "نجود - حساب اختبار الطالبة",
    phone: TEST_PHONE,
    role: "student",
    city: "أبها",
    monthlyBudget: 2500,
    acceptsRoommate: true,
    createdAt: new Date().toISOString(),
  };
  writeStorage(USER_KEY, [user, ...users]);
  writeStorage(CURRENT_USER_KEY, user);
  return user;
}

export function registerOwner(input: Omit<Owner, "id" | "createdAt">): Owner {
  const owner: Owner = { ...input, id: makeId("owner"), createdAt: new Date().toISOString() };
  const owners = readStorage<Owner[]>(OWNER_KEY, []);
  const nextOwners = owners.some((item) => item.phone === owner.phone)
    ? owners.map((item) => (item.phone === owner.phone ? owner : item))
    : [owner, ...owners];
  writeStorage(OWNER_KEY, nextOwners);
  writeStorage(CURRENT_OWNER_KEY, owner);
  return owner;
}

export function getCurrentOwner(): Owner | null {
  return readStorage<Owner | null>(CURRENT_OWNER_KEY, null);
}

export function loginOwner(phone: string): Owner | null {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone === TEST_PHONE) return ensureTestOwner();
  const owner = readStorage<Owner[]>(OWNER_KEY, []).find(
    (item) => normalizePhone(item.phone) === normalizedPhone,
  );
  if (!owner) return null;
  writeStorage(CURRENT_OWNER_KEY, owner);
  return owner;
}

export function logoutOwner(): void {
  localStorage.removeItem(CURRENT_OWNER_KEY);
}

export function logoutUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function registerUser(input: Omit<User, "id" | "createdAt">): User {
  const user: User = { ...input, id: makeId("user"), createdAt: new Date().toISOString() };
  const users = readStorage<User[]>(USER_KEY, []);
  const nextUsers = users.some((item) => item.phone === user.phone)
    ? users.map((item) => (item.phone === user.phone ? user : item))
    : [user, ...users];
  writeStorage(USER_KEY, nextUsers);
  writeStorage(CURRENT_USER_KEY, user);
  return user;
}

export function getCurrentUser(): User | null {
  return readStorage<User | null>(CURRENT_USER_KEY, null);
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

export function loginUser(phone: string): User | null {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone === TEST_PHONE) return ensureTestUser();
  const user = readStorage<User[]>(USER_KEY, []).find(
    (item) => normalizePhone(item.phone) === normalizedPhone,
  );
  if (!user) return null;
  writeStorage(CURRENT_USER_KEY, user);
  return user;
}
