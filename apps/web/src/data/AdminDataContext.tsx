import { createContext, useContext } from "react";

export type PlatformRole =
  "admin" | "support" | "moderator" | "real_estate_agent" | "owner" | "user" | "service_provider";
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
  bookings: AdminCount;
  payments: AdminCount;
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

export interface AdminAgentRecord {
  _id: string;
  fullName: string;
  phone: string;
  verificationStatus: string;
  status: string;
  createdAt: number;
}

export interface AdminBookingRecord {
  _id: string;
  propertyId: string;
  status: string;
  amount: number;
  currency: string;
  startDate: string;
  createdAt: number;
}

export interface AdminPaymentRecord {
  _id: string;
  entityType: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: number;
}

export interface AdminAuditRecord {
  _id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  reason?: string;
  createdAt: number;
}

export interface AdminDataValue {
  accessLoading: boolean;
  authorized: boolean;
  loading: boolean;
  overview: AdminOverview | null;
  users: AdminUserRecord[];
  properties: AdminPropertyRecord[];
  roommates: AdminRoommateRecord[];
  agents: AdminAgentRecord[];
  bookings: AdminBookingRecord[];
  payments: AdminPaymentRecord[];
  auditEvents: AdminAuditRecord[];
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
  updateUserRole(userId: string, role: PlatformRole, reason: string): Promise<void>;
  moderateAgent(
    ownerProfileId: string,
    verification: "unverified" | "pending" | "verified" | "rejected",
    status: "active" | "suspended" | "deleted",
    reason: string,
  ): Promise<void>;
  moderateProperty(
    propertyId: string,
    moderation: ModerationStatus,
    reason?: string,
  ): Promise<void>;
  deleteProperty(propertyId: string): Promise<void>;
  setPropertyOperationalStatus(
    propertyId: string,
    status: "suspended" | "archived" | "published",
    reason: string,
  ): Promise<void>;
  moderateRoommate(
    roommateId: string,
    moderation: ModerationStatus,
    reason?: string,
  ): Promise<void>;
  deleteRoommate(roommateId: string): Promise<void>;
  setRoommateOperationalStatus(
    roommateId: string,
    status: "published" | "suspended" | "hidden" | "deleted",
    reason: string,
  ): Promise<void>;
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
  agents: [],
  bookings: [],
  payments: [],
  auditEvents: [],
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
  updateUserRole: noopAsync,
  moderateAgent: noopAsync,
  moderateProperty: noopAsync,
  deleteProperty: noopAsync,
  setPropertyOperationalStatus: noopAsync,
  moderateRoommate: noopAsync,
  deleteRoommate: noopAsync,
  setRoommateOperationalStatus: noopAsync,
};

export const AdminDataContext = createContext<AdminDataValue>(emptyAdminData);

export function useAdminData() {
  return useContext(AdminDataContext);
}
