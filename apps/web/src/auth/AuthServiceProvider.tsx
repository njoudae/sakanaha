import { ConvexAuthProvider, useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import type { TokenStorage } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useEffect, useMemo, type ReactNode } from "react";
import { api } from "../../../../convex/_generated/api";
import type { AuthService } from "./AuthService";
import { AuthServiceContext } from "./AuthServiceContext";
import { localStorageAuthService } from "./localStorageAuthService";
import { getFeatureFlags, type FeatureFlagMap } from "../config/featureFlags";
import { createConvexAuthClient } from "../data/convexClient";
import {
  getCurrentOwner,
  getCurrentUser,
  loginOwner,
  loginUser,
  logoutOwner,
  registerOwner,
  registerUser,
} from "../services/userService";

function browserSessionStorage(): TokenStorage | undefined {
  return typeof window === "undefined" ? undefined : window.sessionStorage;
}

function capabilitiesFromFlags(flags: FeatureFlagMap) {
  return {
    google: flags["auth.google.enabled"],
    emailOtp: flags["auth.emailOtp.enabled"],
    phoneOtp: flags["auth.phoneOtp.enabled"],
    apple: false,
    sessionRefresh: true,
  };
}

function ConvexAuthServiceBridge({
  children,
  flags,
}: {
  children: ReactNode;
  flags: FeatureFlagMap;
}) {
  const { signIn, signOut } = useAuthActions();
  const authState = useConvexAuth();
  const recordAuthEvent = useMutation(api.authSecurity.recordAuthClientEvent);
  const ensureCurrentProfile = useMutation(api.userProfiles.ensureCurrent);

  useEffect(() => {
    if (!authState.isAuthenticated) return;
    void ensureCurrentProfile();
  }, [authState.isAuthenticated, ensureCurrentProfile]);

  const service = useMemo<AuthService>(
    () => ({
      kind: "convex",
      capabilities: capabilitiesFromFlags(flags),
      getCurrentOwner,
      getCurrentUser,
      loginOwnerWithPhone: async (phone) => loginOwner(phone),
      loginUserWithPhone: async (phone) => loginUser(phone),
      registerOwner: async (input) => registerOwner(input),
      registerUser: async (input) => registerUser(input),
      logout: async () => {
        await recordAuthEvent({ event: "logout" });
        await signOut();
        logoutOwner();
      },
      signInWithGoogle: async () => {
        if (!flags["auth.google.enabled"]) {
          throw new Error("Google login is not enabled.");
        }
        try {
          await signIn("google", { redirectTo: window.location.pathname });
        } catch (error) {
          await recordAuthEvent({
            event: "failed_login",
            provider: "google",
            reason: error instanceof Error ? error.message : "unknown_error",
          });
          throw error;
        }
      },
      requestEmailOtp: async (email) => {
        if (!flags["auth.emailOtp.enabled"]) {
          throw new Error("Email OTP is not enabled.");
        }
        try {
          await signIn("email-otp", { email });
        } catch (error) {
          await recordAuthEvent({
            event: "otp_failed",
            provider: "email-otp",
            channel: "email",
            reason: error instanceof Error ? error.message : "request_failed",
          });
          throw error;
        }
      },
      verifyEmailOtp: async (email, code) => {
        if (!flags["auth.emailOtp.enabled"]) return false;
        try {
          const result = await signIn("email-otp", { email, code });
          if (result.signingIn) {
            await recordAuthEvent({
              event: "otp_verified",
              provider: "email-otp",
              channel: "email",
            });
          }
          return result.signingIn;
        } catch (error) {
          await recordAuthEvent({
            event: "otp_failed",
            provider: "email-otp",
            channel: "email",
            reason: error instanceof Error ? error.message : "verification_failed",
          });
          return false;
        }
      },
      requestPhoneOtp: async (phone) => {
        if (!flags["auth.phoneOtp.enabled"]) {
          throw new Error("Phone OTP is not enabled.");
        }
        try {
          await signIn("phone-otp", { phone });
        } catch (error) {
          await recordAuthEvent({
            event: "otp_failed",
            provider: "phone-otp",
            channel: "sms",
            reason: error instanceof Error ? error.message : "request_failed",
          });
          throw error;
        }
      },
      verifyPhoneOtp: async (phone, code) => {
        if (!flags["auth.phoneOtp.enabled"]) return false;
        try {
          const result = await signIn("phone-otp", { phone, code });
          if (result.signingIn) {
            await recordAuthEvent({
              event: "otp_verified",
              provider: "phone-otp",
              channel: "sms",
            });
          }
          return result.signingIn;
        } catch (error) {
          await recordAuthEvent({
            event: "otp_failed",
            provider: "phone-otp",
            channel: "sms",
            reason: error instanceof Error ? error.message : "verification_failed",
          });
          return false;
        }
      },
      refreshSession: async () => {
        const token = await authState.fetchAccessToken({ forceRefreshToken: true });
        return token !== null;
      },
    }),
    [authState, flags, recordAuthEvent, signIn, signOut],
  );

  return <AuthServiceContext.Provider value={service}>{children}</AuthServiceContext.Provider>;
}

export function AuthServiceProvider({ children }: { children: ReactNode }) {
  const flags = useMemo(() => getFeatureFlags(), []);
  const convexClient = useMemo(() => createConvexAuthClient(flags), [flags]);

  if (convexClient === null) {
    return (
      <AuthServiceContext.Provider value={localStorageAuthService}>
        {children}
      </AuthServiceContext.Provider>
    );
  }

  return (
    <ConvexAuthProvider
      client={convexClient}
      storage={browserSessionStorage()}
      storageNamespace="saknaha-auth"
    >
      <ConvexAuthServiceBridge flags={flags}>{children}</ConvexAuthServiceBridge>
    </ConvexAuthProvider>
  );
}
