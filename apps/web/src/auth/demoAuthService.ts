import type { Owner, User } from "@saknaha/shared-types";
import type { AuthService } from "./AuthService";

const DEMO_PHONE = "0582968140";
const OWNER_SESSION_KEY = "saknaha.demo.owner";
const USER_SESSION_KEY = "saknaha.demo.user";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  if (digits.length === 9 && digits.startsWith("5")) return `0${digits}`;
  return digits;
}

function readSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

function writeSession<T>(key: string, value: T) {
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function demoOwner(): Owner {
  return {
    id: "demo-owner-0582968140",
    publicCode: "SK-DEMO-OWNER",
    fullName: "نجود",
    phone: DEMO_PHONE,
    ministryPropertyNumber: "",
    createdAt: new Date().toISOString(),
  };
}

function demoUser(): User {
  return {
    id: "demo-user-0582968140",
    publicCode: "SK-DEMO-USER",
    name: "نجود",
    phone: DEMO_PHONE,
    role: "student",
    city: "أبها",
    monthlyBudget: 0,
    acceptsRoommate: true,
    createdAt: new Date().toISOString(),
  };
}

export const demoAuthService: AuthService = {
  kind: "convex",
  capabilities: {
    google: false,
    emailOtp: false,
    phoneOtp: false,
    demoDirectPhone: true,
    apple: false,
    sessionRefresh: false,
  },
  universityBranches: [],
  selectedUniversityBranch: null,
  getCurrentOwner: () => readSession<Owner>(OWNER_SESSION_KEY),
  getCurrentUser: () => readSession<User>(USER_SESSION_KEY),
  loginOwnerWithPhone: async (phone) => {
    if (normalizePhone(phone) !== DEMO_PHONE) return null;
    const owner = demoOwner();
    writeSession(OWNER_SESSION_KEY, owner);
    return owner;
  },
  loginUserWithPhone: async (phone) => {
    if (normalizePhone(phone) !== DEMO_PHONE) return null;
    const user = demoUser();
    writeSession(USER_SESSION_KEY, user);
    return user;
  },
  registerOwner: async () => {
    throw new Error("إنشاء الحسابات غير متاح في وضع العرض.");
  },
  registerUser: async () => {
    throw new Error("إنشاء الحسابات غير متاح في وضع العرض.");
  },
  logout: async () => {
    window.sessionStorage.removeItem(OWNER_SESSION_KEY);
    window.sessionStorage.removeItem(USER_SESSION_KEY);
  },
  signInWithGoogle: async () => {
    throw new Error("Google login is not enabled.");
  },
  requestEmailOtp: async () => {
    throw new Error("Email OTP is not enabled.");
  },
  verifyEmailOtp: async () => false,
  requestPhoneOtp: async () => {
    throw new Error("Phone OTP is not enabled.");
  },
  verifyPhoneOtp: async () => false,
  refreshSession: async () => false,
  saveSelectedUniversityBranch: async () => undefined,
};
