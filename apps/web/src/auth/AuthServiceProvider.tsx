import { ConvexAuthProvider, useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import type { TokenStorage } from "@convex-dev/auth/react";
import { ConvexProvider, useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AuthService } from "./AuthService";
import { AuthServiceContext } from "./AuthServiceContext";
import { getFeatureFlags, type FeatureFlagMap } from "../config/featureFlags";
import { createConvexAuthClient, createConvexClient } from "../data/convexClient";
import type { UniversityLocation } from "@saknaha/shared-types";
import type { Owner, User } from "@saknaha/shared-types";
import { MediaServiceContext, browserMediaService } from "../media/MediaServiceContext";
import { createConvexMediaService } from "../media/convexMediaService";
import {
  AdminDataContext,
  emptyAdminData,
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
import { ConvexBusinessProvider } from "../data/ConvexBusinessProvider";

const unavailableAuthService: AuthService = {
  kind: "convex",
  capabilities: {
    google: false,
    emailOtp: false,
    phoneOtp: false,
    apple: false,
    sessionRefresh: false,
  },
  universityBranches: [],
  selectedUniversityBranch: null,
  getCurrentOwner: () => null,
  getCurrentUser: () => null,
  loginOwnerWithPhone: async () => null,
  loginUserWithPhone: async () => null,
  registerOwner: async () => {
    throw new Error("Authentication is not configured.");
  },
  registerUser: async () => {
    throw new Error("Authentication is not configured.");
  },
  logout: async () => undefined,
  signInWithGoogle: async () => {
    throw new Error("Authentication is not configured.");
  },
  requestEmailOtp: async () => {
    throw new Error("Authentication is not configured.");
  },
  verifyEmailOtp: async () => false,
  requestPhoneOtp: async () => {
    throw new Error("Authentication is not configured.");
  },
  verifyPhoneOtp: async () => false,
  refreshSession: async () => false,
  saveSelectedUniversityBranch: async () => undefined,
};

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
  const currentOwner = useQuery(api.agents.current, authState.isAuthenticated ? {} : "skip");
  const saveOwner = useMutation(api.agents.saveMine);
  const updateCurrentUser = useMutation(api.users.updateMine);
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
  const adminAgents = useQuery(
    api.agents.listForAdmin,
    isAdmin
      ? {
          paginationOpts: { numItems: 100, cursor: null },
        }
      : "skip",
  );
  const adminBookings = useQuery(api.admin.listBookings, isAdmin ? {} : "skip");
  const adminPayments = useQuery(api.admin.listPayments, isAdmin ? {} : "skip");
  const adminAuditEvents = useQuery(api.admin.listAuditEvents, isAdmin ? {} : "skip");
  const updateAdminUserStatus = useMutation(api.admin.updateUserStatus);
  const updateAdminUserRole = useMutation(api.admin.updateUserRole);
  const moderateAdminAgent = useMutation(api.agents.moderate);
  const moderateAdminProperty = useMutation(api.admin.moderateProperty);
  const deleteAdminProperty = useMutation(api.admin.deleteProperty);
  const setAdminPropertyOperationalStatus = useMutation(api.admin.setPropertyOperationalStatus);
  const moderateAdminRoommate = useMutation(api.admin.moderateRoommateRequest);
  const deleteAdminRoommate = useMutation(api.admin.deleteRoommateRequest);
  const setAdminRoommateOperationalStatus = useMutation(api.admin.setRoommateCardOperationalStatus);
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
          adminRoommates === undefined ||
          adminAgents === undefined ||
          adminBookings === undefined ||
          adminPayments === undefined ||
          adminAuditEvents === undefined),
      overview: adminOverview ?? null,
      users: adminUsers ?? [],
      properties: adminProperties ?? [],
      roommates: adminRoommates ?? [],
      agents: adminAgents?.page ?? [],
      bookings: adminBookings ?? [],
      payments: adminPayments ?? [],
      auditEvents: adminAuditEvents ?? [],
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
      updateUserRole: async (userId, role, reason) => {
        await updateAdminUserRole({
          userId: userId as Id<"userProfiles">,
          role,
          reason,
        });
      },
      moderateAgent: async (ownerProfileId, verification, status, reason) => {
        await moderateAdminAgent({
          ownerProfileId: ownerProfileId as Id<"ownerProfiles">,
          verification,
          status,
          reason,
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
      setPropertyOperationalStatus: async (propertyId, status, reason) => {
        await setAdminPropertyOperationalStatus({
          propertyId: propertyId as Id<"properties">,
          status,
          reason,
        });
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
      setRoommateOperationalStatus: async (roommateId, status, reason) => {
        await setAdminRoommateOperationalStatus({
          requestId: roommateId as Id<"roommateRequests">,
          status,
          reason,
        });
      },
    }),
    [
      adminOverview,
      adminAgents,
      adminAuditEvents,
      adminBookings,
      adminPayments,
      adminProperties,
      adminRoommates,
      adminUsers,
      authState.isAuthenticated,
      currentProfile,
      isAdmin,
      moderateAdminProperty,
      moderateAdminAgent,
      moderateAdminRoommate,
      deleteAdminProperty,
      deleteAdminRoommate,
      setAdminPropertyOperationalStatus,
      setAdminRoommateOperationalStatus,
      propertyModeration,
      propertySearch,
      updateAdminUserStatus,
      updateAdminUserRole,
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
        (activeUniversityBranches ?? []) as readonly (ConvexUniversityBranch | UniversityLocation)[]
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
      getCurrentOwner: () =>
        currentOwner
          ? ({
              id: currentOwner._id,
              publicCode: currentProfile?.publicCode,
              fullName: currentOwner.fullName,
              email: currentProfile?.email,
              phone: currentOwner.phone,
              nationalId: currentOwner.ministryPropertyNumber,
              region: currentProfile?.city,
              ministryPropertyNumber: currentOwner.ministryPropertyNumber ?? "",
              createdAt: new Date(currentOwner.createdAt).toISOString(),
            } satisfies Owner)
          : null,
      getCurrentUser: () =>
        currentProfile
          ? ({
              id: currentProfile._id,
              publicCode: currentProfile.publicCode,
              name: currentProfile.name,
              email: currentProfile.email,
              phone: currentProfile.phone ?? "",
              role: currentProfile.userType ?? "employee",
              platformRole: currentProfile.primaryRole,
              city: currentProfile.city ?? "",
              monthlyBudget: currentProfile.monthlyBudget ?? 0,
              acceptsRoommate: currentProfile.acceptsRoommate ?? false,
              roommatePreferences: currentProfile.roommatePreferences,
              selectedUniversityBranchId: currentProfile.selectedUniversityBranchId,
              createdAt: new Date(currentProfile.createdAt).toISOString(),
            } satisfies User)
          : null,
      loginOwnerWithPhone: async () => null,
      loginUserWithPhone: async () => null,
      registerOwner: async (input) => {
        const ownerId = await saveOwner({
          fullName: input.fullName,
          phone: input.phone,
          ministryPropertyNumber: input.ministryPropertyNumber,
        });
        return {
          ...input,
          id: ownerId,
          createdAt: new Date().toISOString(),
        };
      },
      registerUser: async (input) => {
        await updateCurrentUser({
          name: input.name,
          city: input.city,
          phone: input.phone,
          email: input.email,
          roommatePreferences: input.roommatePreferences,
        });
        return {
          ...input,
          id: currentProfile?._id ?? "",
          createdAt: currentProfile
            ? new Date(currentProfile.createdAt).toISOString()
            : new Date().toISOString(),
        };
      },
      logout: async () => {
        await recordAuthEvent({ event: "logout" }).catch(() => undefined);
        await signOut();
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
      currentOwner,
      currentProfile,
      flags,
      recordAuthEvent,
      saveSelectedUniversityBranch,
      saveOwner,
      signIn,
      signOut,
      updateCurrentUser,
    ],
  );

  return (
    <AuthServiceContext.Provider value={service}>
      <AdminDataContext.Provider value={adminData}>
        <NotificationDataContext.Provider value={notificationData}>
          <MapsDataContext.Provider value={mapsData}>
            <MediaServiceContext.Provider value={mediaService}>
              <ConvexBusinessProvider authenticated={authState.isAuthenticated}>
                {children}
              </ConvexBusinessProvider>
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
  const dataClient = useMemo(() => createConvexClient(flags), [flags]);

  if (convexClient === null) {
    if (dataClient === null) {
      return (
        <AuthServiceContext.Provider value={unavailableAuthService}>
          <AdminDataContext.Provider value={emptyAdminData}>
            <NotificationDataContext.Provider value={emptyNotificationData}>
              <MapsDataContext.Provider value={browserMapsData}>
                <MediaServiceContext.Provider value={browserMediaService}>
                  {children}
                </MediaServiceContext.Provider>
              </MapsDataContext.Provider>
            </NotificationDataContext.Provider>
          </AdminDataContext.Provider>
        </AuthServiceContext.Provider>
      );
    }
    return (
      <ConvexProvider client={dataClient}>
        <AuthServiceContext.Provider value={unavailableAuthService}>
          <AdminDataContext.Provider value={emptyAdminData}>
            <NotificationDataContext.Provider value={emptyNotificationData}>
              <MapsDataContext.Provider value={browserMapsData}>
                <MediaServiceContext.Provider value={browserMediaService}>
                  <ConvexBusinessProvider authenticated={false}>{children}</ConvexBusinessProvider>
                </MediaServiceContext.Provider>
              </MapsDataContext.Provider>
            </NotificationDataContext.Provider>
          </AdminDataContext.Provider>
        </AuthServiceContext.Provider>
      </ConvexProvider>
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
