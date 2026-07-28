import { ConvexAuthProvider, useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import type { TokenStorage } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AuthService } from "./AuthService";
import { AuthServiceContext } from "./AuthServiceContext";
import { localStorageAuthService } from "./localStorageAuthService";
import { getFeatureFlags, type FeatureFlagMap } from "../config/featureFlags";
import { createConvexAuthClient } from "../data/convexClient";
import { mockUniversities } from "@saknaha/constants/mockUniversities";
import type { UniversityLocation } from "@saknaha/shared-types";
import {
  getCurrentOwner,
  getCurrentUser,
  loginOwner,
  loginUser,
  logoutOwner,
  logoutUser,
  registerOwner,
  registerUser,
} from "../services/userService";
import { MediaServiceContext, browserMediaService } from "../media/MediaServiceContext";
import { createConvexMediaService } from "../media/convexMediaService";
import {
  AdminDataContext,
  LocalAdminDataProvider,
  type AdminDataValue,
  type ModerationStatus,
  type PlatformRole,
  type ProfileStatus,
} from "../data/AdminDataContext";
import {
  NotificationDataContext,
  emptyNotificationData,
  type NotificationDataValue,
} from "../data/NotificationDataContext";
import { browserMapsData, MapsDataContext, type MapsDataValue } from "../data/MapsDataContext";

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

interface ConvexUniversityBranch {
  id: string;
  universityId: string;
  universityName: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  active: boolean;
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
  const saveSelectedUniversityBranch = useMutation(api.universities.saveSelectedBranch);
  const activeUniversityBranches = useQuery(api.universities.listActiveBranches, {});
  const currentUniversityBranch = useQuery(api.universities.currentSelectedBranch, {});
  const currentProfile = useQuery(
    api.userProfiles.current,
    authState.isAuthenticated ? {} : "skip",
  );
  const createMediaUpload = useMutation(api.media.createUpload);
  const createVideoUpload = useMutation(api.media.createVideoUpload);
  const retryMediaUpload = useMutation(api.media.retryUpload);
  const registerUploadedImage = useMutation(api.media.registerUploadedImage);
  const registerUploadedVideo = useMutation(api.media.registerUploadedVideo);
  const registerUploadedThumbnail = useMutation(api.media.registerUploadedThumbnail);
  const finalizeMediaUpload = useAction(api.media.finalizeUpload);
  const finalizeVideoUpload = useAction(api.media.finalizeVideoUpload);
  const resolveGoogleMapsLocationLink = useAction(api.maps.resolveGoogleMapsLocationLink);
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<PlatformRole | "">("");
  const [userStatus, setUserStatus] = useState<ProfileStatus | "">("");
  const [propertySearch, setPropertySearch] = useState("");
  const [propertyModeration, setPropertyModeration] = useState<ModerationStatus | "">("");
  const isAdmin = currentProfile?.primaryRole === "admin";
  const adminOverview = useQuery(api.admin.overview, isAdmin ? {} : "skip");
  const adminUsers = useQuery(
    api.admin.listUsers,
    isAdmin
      ? {
          search: userSearch || undefined,
          role: userRole || undefined,
          status: userStatus || undefined,
        }
      : "skip",
  );
  const adminProperties = useQuery(
    api.admin.listProperties,
    isAdmin
      ? {
          search: propertySearch || undefined,
          moderation: propertyModeration || undefined,
        }
      : "skip",
  );
  const adminRoommates = useQuery(
    api.admin.listRoommateRequests,
    isAdmin
      ? {
          moderation: propertyModeration || undefined,
        }
      : "skip",
  );
  const updateAdminUserStatus = useMutation(api.admin.updateUserStatus);
  const moderateAdminProperty = useMutation(api.admin.moderateProperty);
  const deleteAdminProperty = useMutation(api.admin.deleteProperty);
  const moderateAdminRoommate = useMutation(api.admin.moderateRoommateRequest);
  const deleteAdminRoommate = useMutation(api.admin.deleteRoommateRequest);
  const notificationList = useQuery(
    api.notifications.list,
    currentProfile ? { paginationOpts: { numItems: 30, cursor: null } } : "skip",
  );
  const notificationSummary = useQuery(
    api.notifications.unreadSummary,
    currentProfile ? {} : "skip",
  );
  const markNotificationRead = useMutation(api.notifications.markRead);
  const markNotificationUnread = useMutation(api.notifications.markUnread);
  const markAllNotificationsRead = useMutation(api.notifications.markAllRead);

  const convexMediaService = useMemo(
    () =>
      createConvexMediaService({
        createUpload: createMediaUpload,
        retryUpload: retryMediaUpload,
        registerUploadedImage,
        registerUploadedThumbnail,
        finalizeUpload: finalizeMediaUpload,
        createVideoUpload,
        registerUploadedVideo,
        finalizeVideoUpload,
      }),
    [
      createMediaUpload,
      retryMediaUpload,
      registerUploadedImage,
      registerUploadedThumbnail,
      finalizeMediaUpload,
      createVideoUpload,
      registerUploadedVideo,
      finalizeVideoUpload,
    ],
  );
  const mediaService =
    authState.isAuthenticated && currentProfile ? convexMediaService : browserMediaService;

  const adminData = useMemo<AdminDataValue>(
    () => ({
      accessLoading: authState.isAuthenticated && currentProfile === undefined,
      authorized: isAdmin,
      loading:
        isAdmin &&
        (adminOverview === undefined ||
          adminUsers === undefined ||
          adminProperties === undefined ||
          adminRoommates === undefined),
      overview: adminOverview ?? null,
      users: adminUsers ?? [],
      properties: adminProperties ?? [],
      roommates: adminRoommates ?? [],
      userSearch,
      userRole,
      userStatus,
      propertySearch,
      propertyModeration,
      setUserSearch,
      setUserRole,
      setUserStatus,
      setPropertySearch,
      setPropertyModeration,
      updateUserStatus: async (userId, status) => {
        await updateAdminUserStatus({
          userId: userId as Id<"userProfiles">,
          status,
        });
      },
      moderateProperty: async (propertyId, moderation, reason) => {
        await moderateAdminProperty({
          propertyId: propertyId as Id<"properties">,
          moderation,
          reason,
        });
      },
      deleteProperty: async (propertyId) => {
        await deleteAdminProperty({ propertyId: propertyId as Id<"properties"> });
      },
      moderateRoommate: async (roommateId, moderation, reason) => {
        await moderateAdminRoommate({
          requestId: roommateId as Id<"roommateRequests">,
          moderation,
          reason,
        });
      },
      deleteRoommate: async (roommateId) => {
        await deleteAdminRoommate({ requestId: roommateId as Id<"roommateRequests"> });
      },
    }),
    [
      adminOverview,
      adminProperties,
      adminRoommates,
      adminUsers,
      authState.isAuthenticated,
      currentProfile,
      isAdmin,
      moderateAdminProperty,
      moderateAdminRoommate,
      deleteAdminProperty,
      deleteAdminRoommate,
      propertyModeration,
      propertySearch,
      updateAdminUserStatus,
      userRole,
      userSearch,
      userStatus,
    ],
  );

  const notificationData = useMemo<NotificationDataValue>(
    () => ({
      enabled: currentProfile !== null && currentProfile !== undefined,
      loading: currentProfile !== null && notificationList === undefined,
      notifications: notificationList?.page ?? [],
      unreadCount: notificationSummary?.count ?? 0,
      markRead: async (notificationId) => {
        await markNotificationRead({
          notificationId: notificationId as Id<"notifications">,
        });
      },
      markUnread: async (notificationId) => {
        await markNotificationUnread({
          notificationId: notificationId as Id<"notifications">,
        });
      },
      markAllRead: async () => {
        let hasMore = true;
        while (hasMore) {
          const result = await markAllNotificationsRead({});
          hasMore = result.hasMore;
        }
      },
    }),
    [
      currentProfile,
      markAllNotificationsRead,
      markNotificationRead,
      markNotificationUnread,
      notificationList,
      notificationSummary,
    ],
  );
  const mapsData = useMemo<MapsDataValue>(
    () => ({
      resolveLocationLink: async (value) => await resolveGoogleMapsLocationLink({ url: value }),
    }),
    [resolveGoogleMapsLocationLink],
  );

  useEffect(() => {
    if (!authState.isAuthenticated) return;
    void ensureCurrentProfile();
  }, [authState.isAuthenticated, ensureCurrentProfile]);

  const service = useMemo<AuthService>(
    () => ({
      kind: "convex",
      capabilities: capabilitiesFromFlags(flags),
      universityBranches: (
        (activeUniversityBranches && activeUniversityBranches.length > 0
          ? activeUniversityBranches
          : mockUniversities) as readonly (ConvexUniversityBranch | UniversityLocation)[]
      ).map((branch) =>
        "latitude" in branch
          ? {
              id: branch.id,
              universityId: branch.universityId,
              universityName: branch.universityName,
              name: branch.name,
              city: branch.city,
              label: branch.name,
              lat: branch.latitude,
              lng: branch.longitude,
              active: branch.active,
            }
          : branch,
      ),
      selectedUniversityBranch: currentUniversityBranch
        ? {
            id: currentUniversityBranch.id,
            universityId: currentUniversityBranch.universityId,
            universityName: currentUniversityBranch.universityName,
            name: currentUniversityBranch.name,
            city: currentUniversityBranch.city,
            label: currentUniversityBranch.name,
            lat: currentUniversityBranch.latitude,
            lng: currentUniversityBranch.longitude,
            active: currentUniversityBranch.active,
          }
        : null,
      getCurrentOwner,
      getCurrentUser,
      loginOwnerWithPhone: async (phone) => loginOwner(phone),
      loginUserWithPhone: async (phone) => loginUser(phone),
      registerOwner: async (input) => registerOwner(input),
      registerUser: async (input) => registerUser(input),
      logout: async () => {
        await recordAuthEvent({ event: "logout" }).catch(() => undefined);
        await signOut();
        logoutOwner();
        logoutUser();
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
          }).catch(() => undefined);
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
          }).catch(() => undefined);
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
            }).catch(() => undefined);
          }
          return result.signingIn;
        } catch (error) {
          await recordAuthEvent({
            event: "otp_failed",
            provider: "email-otp",
            channel: "email",
            reason: error instanceof Error ? error.message : "verification_failed",
          }).catch(() => undefined);
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
          }).catch(() => undefined);
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
            }).catch(() => undefined);
          }
          return result.signingIn;
        } catch (error) {
          await recordAuthEvent({
            event: "otp_failed",
            provider: "phone-otp",
            channel: "sms",
            reason: error instanceof Error ? error.message : "verification_failed",
          }).catch(() => undefined);
          return false;
        }
      },
      refreshSession: async () => {
        const token = await authState.fetchAccessToken({ forceRefreshToken: true });
        return token !== null;
      },
      saveSelectedUniversityBranch: async (branchId) => {
        await saveSelectedUniversityBranch({ branchExternalId: branchId });
      },
    }),
    [
      authState,
      activeUniversityBranches,
      currentUniversityBranch,
      flags,
      recordAuthEvent,
      saveSelectedUniversityBranch,
      signIn,
      signOut,
    ],
  );

  return (
    <AuthServiceContext.Provider value={service}>
      <AdminDataContext.Provider value={adminData}>
        <NotificationDataContext.Provider value={notificationData}>
          <MapsDataContext.Provider value={mapsData}>
            <MediaServiceContext.Provider value={mediaService}>
              {children}
            </MediaServiceContext.Provider>
          </MapsDataContext.Provider>
        </NotificationDataContext.Provider>
      </AdminDataContext.Provider>
    </AuthServiceContext.Provider>
  );
}

export function AuthServiceProvider({ children }: { children: ReactNode }) {
  const flags = useMemo(() => getFeatureFlags(), []);
  const convexClient = useMemo(() => createConvexAuthClient(flags), [flags]);

  if (convexClient === null) {
    if (!flags["auth.localLegacy.enabled"]) {
      throw new Error(
        "Convex Auth must be configured. Legacy local authentication is disabled in this environment.",
      );
    }
    return (
      <AuthServiceContext.Provider value={localStorageAuthService}>
        <LocalAdminDataProvider>
          <NotificationDataContext.Provider value={emptyNotificationData}>
            <MapsDataContext.Provider value={browserMapsData}>
              <MediaServiceContext.Provider value={browserMediaService}>
                {children}
              </MediaServiceContext.Provider>
            </MapsDataContext.Provider>
          </NotificationDataContext.Provider>
        </LocalAdminDataProvider>
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
