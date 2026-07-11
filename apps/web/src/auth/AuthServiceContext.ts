import { createContext } from "react";
import type { AuthService } from "./AuthService";
import { localStorageAuthService } from "./localStorageAuthService";

export const AuthServiceContext = createContext<AuthService>(localStorageAuthService);
