import type { Owner, User } from "@saknaha/shared-types";

export interface AuthCapabilities {
  google: boolean;
  emailOtp: boolean;
  phoneOtp: boolean;
  apple: boolean;
  sessionRefresh: boolean;
}

export interface AuthService {
  readonly kind: "localStorage" | "convex";
  readonly capabilities: AuthCapabilities;
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
}
