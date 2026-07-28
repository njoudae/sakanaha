import { createContext } from "react";
import type { AuthService } from "./AuthService";

export const AuthServiceContext = createContext<AuthService | null>(null);
