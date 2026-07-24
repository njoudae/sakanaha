import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  deleteLocalProperty,
  deleteLocalRoommateRequest,
  getAllRoommateRequests,
  getProperties,
  moderateLocalProperty,
  moderateLocalRoommateRequest,
} from "../services/propertyService";
import { getAllOwners, getAllUsers } from "../services/userService";

export type PlatformRole =
  "admin" | "support" | "moderator" | "owner" | "user" | "service_provider";
export type ProfileStatus = "active" | "pending_claim" | "suspended" | "deleted";
export type ModerationStatus = "pending" | "approved" | "rejected" | "needs_review" | "archived";

export interface AdminCount {
  value: number;
  capped: boolean;
}

export interface AdminOverview {
  users: AdminCount;
  owners: AdminCount;
  properties: AdminCount;
  roommateRequests: AdminCount;
  pendingPropertyApprovals: AdminCount;
  pendingRoommateApprovals: AdminCount;
  approved: AdminCount;
  rejected: AdminCount;
  archived: AdminCount;
  activeUsers: AdminCount;
  publishedProperties: AdminCount;
  openRoommateRequests: AdminCount;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  role: PlatformRole;
  status: ProfileStatus;
  city?: string;
  createdAt: number;
}

export interface AdminPropertyRecord {
  id: string;
  title: string;
  ownerName: string;
  coverImage?: string;
  region?: string;
  city: string;
  district?: string;
  status: string;
  moderationStatus: ModerationStatus;
  rejectionReason?: string;
  price: number;
  createdAt: number;
  submittedAt?: number;
}

export interface AdminRoommateRecord {
  id: string;
  requesterName: string;
  region?: string;
  city?: string;
  district?: string;
  university?: string;
  moderationStatus: ModerationStatus;
  rejectionReason?: string;
  createdAt: number;
  submittedAt?: number;
}

export interface AdminDataValue {
  accessLoading: boolean;
  authorized: boolean;
  loading: boolean;
  overview: AdminOverview | null;
  users: AdminUserRecord[];
  properties: AdminPropertyRecord[];
  roommates: AdminRoommateRecord[];
  userSearch: string;
  userRole: PlatformRole | "";
  userStatus: ProfileStatus | "";
  propertySearch: string;
  propertyModeration: ModerationStatus | "";
  setUserSearch(value: string): void;
  setUserRole(value: PlatformRole | ""): void;
  setUserStatus(value: ProfileStatus | ""): void;
  setPropertySearch(value: string): void;
  setPropertyModeration(value: ModerationStatus | ""): void;
  updateUserStatus(userId: string, status: ProfileStatus): Promise<void>;
  moderateProperty(
    propertyId: string,
    moderation: ModerationStatus,
    reason?: string,
  ): Promise<void>;
  deleteProperty(propertyId: string): Promise<void>;
  moderateRoommate(
    roommateId: string,
    moderation: ModerationStatus,
    reason?: string,
  ): Promise<void>;
  deleteRoommate(roommateId: string): Promise<void>;
}

const noop = () => undefined;
const noopAsync = async () => undefined;

export const emptyAdminData: AdminDataValue = {
  accessLoading: false,
  authorized: false,
  loading: false,
  overview: null,
  users: [],
  properties: [],
  roommates: [],
  userSearch: "",
  userRole: "",
  userStatus: "",
  propertySearch: "",
  propertyModeration: "",
  setUserSearch: noop,
  setUserRole: noop,
  setUserStatus: noop,
  setPropertySearch: noop,
  setPropertyModeration: noop,
  updateUserStatus: noopAsync,
  moderateProperty: noopAsync,
  deleteProperty: noopAsync,
  moderateRoommate: noopAsync,
  deleteRoommate: noopAsync,
};

export const AdminDataContext = createContext<AdminDataValue>(emptyAdminData);

export function useAdminData() {
  return useContext(AdminDataContext);
}

function count(value: number): AdminCount {
  return { value, capped: false };
}

function localModeration(status: string | undefined): ModerationStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "archived") return "archived";
  return "pending";
}

export function LocalAdminDataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<PlatformRole | "">("");
  const [userStatus, setUserStatus] = useState<ProfileStatus | "">("");
  const [propertySearch, setPropertySearch] = useState("");
  const [propertyModeration, setPropertyModeration] = useState<ModerationStatus | "">("");

  const value = useMemo<AdminDataValue>(() => {
    void version;
    const allUsers = getAllUsers();
    const owners = getAllOwners();
    const allProperties = getProperties();
    const allRoommates = getAllRoommateRequests();
    const normalizedSearch = userSearch.trim().toLocaleLowerCase();
    const normalizedPropertySearch = propertySearch.trim().toLocaleLowerCase();
    const users: AdminUserRecord[] = [
      ...allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        role: user.platformRole ?? "user",
        status: "active" as const,
        city: user.city,
        createdAt: Date.parse(user.createdAt),
      })),
      ...owners.map((owner) => ({
        id: owner.id,
        name: owner.fullName,
        role: "owner" as const,
        status: "active" as const,
        city: owner.region,
        createdAt: Date.parse(owner.createdAt),
      })),
    ]
      .filter((user) => !userRole || user.role === userRole)
      .filter((user) => !userStatus || user.status === userStatus)
      .filter(
        (user) =>
          !normalizedSearch ||
          `${user.name} ${user.city ?? ""}`.toLocaleLowerCase().includes(normalizedSearch),
      );
    const properties: AdminPropertyRecord[] = allProperties
      .map((property) => ({
        id: property.id,
        title: property.title,
        ownerName: property.ownerName,
        coverImage: property.images[0],
        region: property.region,
        city: property.city,
        district: property.district ?? property.neighborhood,
        status: property.status,
        moderationStatus: localModeration(property.publicationStatus),
        rejectionReason: property.rejectionReason,
        price: property.price,
        createdAt: Date.parse(property.createdAt),
        submittedAt: property.submittedAt ? Date.parse(property.submittedAt) : undefined,
      }))
      .filter((property) => !propertyModeration || property.moderationStatus === propertyModeration)
      .filter(
        (property) =>
          !normalizedPropertySearch ||
          `${property.title} ${property.city} ${property.district ?? ""}`
            .toLocaleLowerCase()
            .includes(normalizedPropertySearch),
      );
    const roommates: AdminRoommateRecord[] = allRoommates.map((request) => ({
      id: request.id,
      requesterName: request.requesterName ?? "مستخدمة",
      region: request.region,
      city: request.city,
      district: request.district,
      university: request.organization,
      moderationStatus: localModeration(request.publicationStatus),
      rejectionReason: request.rejectionReason,
      createdAt: Date.parse(request.createdAt),
      submittedAt: request.submittedAt ? Date.parse(request.submittedAt) : undefined,
    }));
    const pendingProperties = allProperties.filter(
      (property) => property.publicationStatus === "pending_review",
    );
    const pendingRoommates = allRoommates.filter(
      (request) => request.publicationStatus === "pending_review",
    );
    const allStatuses = [
      ...allProperties.map((item) => item.publicationStatus),
      ...allRoommates.map((item) => item.publicationStatus),
    ];
    return {
      accessLoading: false,
      authorized: false,
      loading: false,
      overview: {
        users: count(allUsers.length),
        owners: count(owners.length),
        properties: count(allProperties.length),
        roommateRequests: count(allRoommates.length),
        pendingPropertyApprovals: count(pendingProperties.length),
        pendingRoommateApprovals: count(pendingRoommates.length),
        approved: count(allStatuses.filter((status) => status === "approved").length),
        rejected: count(allStatuses.filter((status) => status === "rejected").length),
        archived: count(allStatuses.filter((status) => status === "archived").length),
        activeUsers: count(allUsers.length),
        publishedProperties: count(
          allProperties.filter((property) => property.publicationStatus === "approved").length,
        ),
        openRoommateRequests: count(
          allRoommates.filter((request) => request.publicationStatus === "approved").length,
        ),
      },
      users,
      properties,
      roommates,
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
      updateUserStatus: async () => undefined,
      moderateProperty: async (propertyId, moderation, reason) => {
        moderateLocalProperty(
          propertyId,
          moderation === "pending"
            ? "pending_review"
            : moderation === "needs_review"
              ? "rejected"
              : moderation,
          reason,
        );
        setVersion((current) => current + 1);
      },
      deleteProperty: async (propertyId) => {
        deleteLocalProperty(propertyId);
        setVersion((current) => current + 1);
      },
      moderateRoommate: async (roommateId, moderation, reason) => {
        moderateLocalRoommateRequest(
          roommateId,
          moderation === "pending"
            ? "pending_review"
            : moderation === "needs_review"
              ? "rejected"
              : moderation,
          reason,
        );
        setVersion((current) => current + 1);
      },
      deleteRoommate: async (roommateId) => {
        deleteLocalRoommateRequest(roommateId);
        setVersion((current) => current + 1);
      },
    };
  }, [propertyModeration, propertySearch, userRole, userSearch, userStatus, version]);

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}
