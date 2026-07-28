import type { Owner, UniversityLocation, User } from "@saknaha/shared-types";

export interface AuthCapabilities {
  google: boolean;
  emailOtp: boolean;
  phoneOtp: boolean;
  apple: boolean;
  sessionRefresh: boolean;
}

export interface AuthService {
  readonly kind: "convex";
  readonly capabilities: AuthCapabilities;
  readonly universityBranches: readonly UniversityLocation[];
  readonly selectedUniversityBranch: UniversityLocation | null;
  getCurrentOwner(): Owner | null;
  getCurrentUser(): User | null;
  loginOwnerWithPhone(phone: string): Promise<Owner | null>;
  loginUserWithPhone(phone: string): Promise<User | null>;
  registerOwner(input: Omit<Owner, "id" | "createdAt">): Promise<Owner>;
  registerUser(input: Omit<User, "id" | "createdAt">): Promise<User>;
  logout(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  requestEmailOtp(email: string): Promise<void>;
  verifyEmailOtp(email: string, code: string): Promise<boolean>;
  requestPhoneOtp(phone: string): Promise<void>;
  verifyPhoneOtp(phone: string, code: string): Promise<boolean>;
  refreshSession(): Promise<boolean>;
  saveSelectedUniversityBranch(branchId: string | null): Promise<void>;
}
