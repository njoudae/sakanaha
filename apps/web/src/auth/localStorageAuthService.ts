import type { AuthService } from "./AuthService";
import {
  getCurrentOwner,
  getCurrentUser,
  loginOwner,
  loginUser,
  logoutOwner,
  registerOwner,
  registerUser,
} from "../services/userService";

export const localStorageAuthService: AuthService = {
  kind: "localStorage",
  capabilities: {
    google: false,
    emailOtp: false,
    phoneOtp: false,
    apple: false,
    sessionRefresh: false,
  },
  getCurrentOwner,
  getCurrentUser,
  loginOwnerWithPhone: async (phone) => loginOwner(phone),
  loginUserWithPhone: async (phone) => loginUser(phone),
  registerOwner: async (input) => registerOwner(input),
  registerUser: async (input) => registerUser(input),
  logout: async () => {
    logoutOwner();
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
};
