import type { Owner, User } from "@saknaha/shared-types";
import { makeId, readStorage, writeStorage } from "./storage";

const OWNER_KEY = "saknaha.owners";
const USER_KEY = "saknaha.users";
const CURRENT_OWNER_KEY = "saknaha.currentOwner";
const CURRENT_USER_KEY = "saknaha.currentUser";

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
  const owner = readStorage<Owner[]>(OWNER_KEY, []).find((item) => item.phone === phone.trim());
  if (!owner) return null;
  writeStorage(CURRENT_OWNER_KEY, owner);
  return owner;
}

export function logoutOwner(): void {
  localStorage.removeItem(CURRENT_OWNER_KEY);
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

export function loginUser(phone: string): User | null {
  const user = readStorage<User[]>(USER_KEY, []).find((item) => item.phone === phone.trim());
  if (!user) return null;
  writeStorage(CURRENT_USER_KEY, user);
  return user;
}
