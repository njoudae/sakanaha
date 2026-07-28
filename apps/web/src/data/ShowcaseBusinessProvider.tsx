import { useMemo, type ReactNode } from "react";
import {
  BusinessDataContext,
  emptyBusinessData,
  type BusinessDataValue,
} from "./BusinessDataContext";
import {
  localDevelopmentProperties,
  localDevelopmentRoommateRequests,
} from "./localDevelopmentExamples";

export function ShowcaseBusinessProvider({ children }: { children: ReactNode }) {
  const value = useMemo<BusinessDataValue>(
    () => ({
      ...emptyBusinessData,
      properties: localDevelopmentProperties,
      roommateRequests: localDevelopmentRoommateRequests,
    }),
    [],
  );

  return <BusinessDataContext.Provider value={value}>{children}</BusinessDataContext.Provider>;
}
