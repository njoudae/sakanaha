export interface CanonicalIdentity {
  /** Platform-owned opaque identifier. It must not contain a provider subject, phone, or email. */
  identityKey: string;
}

export interface IdentitySession {
  identity: CanonicalIdentity;
  expiresAt: number;
  refreshExpiresAt: number;
}

export interface IdentitySignInRequest {
  returnTo?: string;
}

/**
 * Boundary implemented by a future production identity provider integration.
 * No provider SDK types may cross this interface.
 */
export interface IdentityProviderAdapter {
  signIn(request?: IdentitySignInRequest): Promise<IdentitySession>;
  signOut(): Promise<void>;
  getCurrentIdentity(): Promise<CanonicalIdentity | null>;
  refreshSession(): Promise<IdentitySession | null>;
  validateSession(): Promise<IdentitySession | null>;
}

export class IdentityUnavailableError extends Error {
  constructor() {
    super("A production identity provider has not been configured.");
    this.name = "IdentityUnavailableError";
  }
}

export const inactiveIdentityAdapter: IdentityProviderAdapter = {
  async signIn() {
    throw new IdentityUnavailableError();
  },
  async signOut() {},
  async getCurrentIdentity() {
    return null;
  },
  async refreshSession() {
    return null;
  },
  async validateSession() {
    return null;
  },
};
