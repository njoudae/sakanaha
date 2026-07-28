import { useContext } from "react";
import { AuthServiceContext } from "./AuthServiceContext";

export function useAuthService() {
  const service = useContext(AuthServiceContext);
  if (service === null) throw new Error("AuthServiceProvider is missing.");
  return service;
}
