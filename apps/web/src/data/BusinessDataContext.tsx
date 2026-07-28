import { createContext, useContext } from "react";
import type {
  Interest,
  Property,
  RoommateJoinRequest,
  RoommateLifestylePreferences,
  RoommateRequest,
} from "@saknaha/shared-types";

export interface BusinessActivity {
  favorites: Array<{ property: Property }>;
  interests: Array<{ interest: Interest; property: Property | null }>;
  roommateCards: Array<{
    request: RoommateRequest;
    property: Property | null;
    views: number;
    incomingRequests: RoommateJoinRequest[];
  }>;
  sentJoinRequests: Array<{
    joinRequest: RoommateJoinRequest;
    roommateRequest: RoommateRequest | null;
    property: Property | null;
  }>;
  viewedProperties: [];
  viewedRoommateRequests: [];
}

export interface BusinessDataValue {
  loading: boolean;
  properties: Property[];
  ownerProperties: Property[];
  roommateRequests: RoommateRequest[];
  favoritePropertyIds: string[];
  activity: BusinessActivity;
  saveProperty(property: Property): Promise<string>;
  submitProperty(propertyId: string): Promise<void>;
  setPropertyPaused(propertyId: string, paused: boolean): Promise<void>;
  setFavorite(propertyId: string, favorite: boolean): Promise<void>;
  registerPropertyInterest(propertyId: string, mode: Interest["mode"]): Promise<void>;
  withdrawPropertyInterest(propertyId: string): Promise<void>;
  requestBooking(propertyId: string): Promise<void>;
  createRoommateCard(request: Omit<RoommateRequest, "id" | "createdAt">): Promise<string>;
  updateRoommateCard(
    requestId: string,
    request: Pick<
      RoommateRequest,
      | "source"
      | "linkedPropertyId"
      | "externalHousing"
      | "userType"
      | "age"
      | "organization"
      | "major"
      | "moveInDate"
      | "bio"
      | "availableRooms"
      | "pricePerPerson"
      | "preferences"
      | "region"
      | "city"
      | "district"
      | "landmark"
    >,
  ): Promise<void>;
  closeRoommateCard(requestId: string): Promise<void>;
  registerRoommateInterest(requestId: string): Promise<void>;
  updateUserProfile(input: {
    name: string;
    city?: string;
    roommatePreferences?: RoommateLifestylePreferences;
  }): Promise<void>;
}

export const emptyBusinessData: BusinessDataValue = {
  loading: false,
  properties: [],
  ownerProperties: [],
  roommateRequests: [],
  favoritePropertyIds: [],
  activity: {
    favorites: [],
    interests: [],
    roommateCards: [],
    sentJoinRequests: [],
    viewedProperties: [],
    viewedRoommateRequests: [],
  },
  saveProperty: async () => {
    throw new Error("Authentication is required.");
  },
  submitProperty: async () => {
    throw new Error("Authentication is required.");
  },
  setPropertyPaused: async () => {
    throw new Error("Authentication is required.");
  },
  setFavorite: async () => {
    throw new Error("Authentication is required.");
  },
  registerPropertyInterest: async () => {
    throw new Error("Authentication is required.");
  },
  withdrawPropertyInterest: async () => {
    throw new Error("Authentication is required.");
  },
  requestBooking: async () => {
    throw new Error("Authentication is required.");
  },
  createRoommateCard: async () => {
    throw new Error("Authentication is required.");
  },
  updateRoommateCard: async () => {
    throw new Error("Authentication is required.");
  },
  closeRoommateCard: async () => {
    throw new Error("Authentication is required.");
  },
  registerRoommateInterest: async () => {
    throw new Error("Authentication is required.");
  },
  updateUserProfile: async () => {
    throw new Error("Authentication is required.");
  },
};

export const BusinessDataContext = createContext<BusinessDataValue>(emptyBusinessData);

export function useBusinessData() {
  return useContext(BusinessDataContext);
}
