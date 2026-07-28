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

export function DevelopmentBusinessProvider({ children }: { children: ReactNode }) {
  const value = useMemo<BusinessDataValue>(
    () => ({
      ...emptyBusinessData,
      properties: import.meta.env.DEV ? localDevelopmentProperties : [],
      roommateRequests: import.meta.env.DEV ? localDevelopmentRoommateRequests : [],
    }),
    [],
  );

  return <BusinessDataContext.Provider value={value}>{children}</BusinessDataContext.Provider>;
}
