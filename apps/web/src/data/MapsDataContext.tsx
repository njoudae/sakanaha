import { createContext, useContext } from "react";
import {
  resolveGoogleMapsLocationUrl,
  type GoogleMapsLocationParseResult,
} from "@saknaha/utils/directions";

export interface MapsDataValue {
  resolveLocationLink(value: string): Promise<GoogleMapsLocationParseResult>;
}

export const browserMapsData: MapsDataValue = {
  resolveLocationLink: (value) => resolveGoogleMapsLocationUrl(value),
};

export const MapsDataContext = createContext<MapsDataValue>(browserMapsData);

export function useMapsData() {
  return useContext(MapsDataContext);
}
