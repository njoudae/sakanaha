import { useContext } from "react";
import { AuthServiceContext } from "./AuthServiceContext";

export function useAuthService() {
  return useContext(AuthServiceContext);
}
