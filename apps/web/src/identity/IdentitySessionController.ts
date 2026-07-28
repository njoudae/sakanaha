import type {
  CanonicalIdentity,
  IdentityProviderAdapter,
  IdentitySession,
  IdentitySignInRequest,
} from "./IdentityProviderAdapter";

export type IdentitySessionState =
  | { status: "anonymous"; session: null }
  | { status: "authenticated"; session: IdentitySession }
  | { status: "expired"; session: null };

export class IdentitySessionController {
  private state: IdentitySessionState = { status: "anonymous", session: null };

  constructor(
    private readonly adapter: IdentityProviderAdapter,
    private readonly now: () => number = Date.now,
  ) {}

  currentState(): IdentitySessionState {
    return this.state;
  }

  async signIn(request?: IdentitySignInRequest): Promise<IdentitySessionState> {
    const session = await this.adapter.signIn(request);
    return this.accept(session);
  }

  async initialize(): Promise<IdentitySessionState> {
    return this.accept(await this.adapter.validateSession());
  }

  async currentIdentity(): Promise<CanonicalIdentity | null> {
    if (this.state.status !== "authenticated") return null;
    return await this.adapter.getCurrentIdentity();
  }

  async refresh(): Promise<IdentitySessionState> {
    return this.accept(await this.adapter.refreshSession());
  }

  async signOut(): Promise<IdentitySessionState> {
    try {
      await this.adapter.signOut();
    } finally {
      this.state = { status: "anonymous", session: null };
    }
    return this.state;
  }

  private accept(session: IdentitySession | null): IdentitySessionState {
    if (session === null) {
      this.state = { status: "anonymous", session: null };
    } else if (
      session.expiresAt <= this.now() ||
      session.refreshExpiresAt <= session.expiresAt ||
      !session.identity.identityKey.trim()
    ) {
      this.state = { status: "expired", session: null };
    } else {
      this.state = { status: "authenticated", session };
    }
    return this.state;
  }
}
