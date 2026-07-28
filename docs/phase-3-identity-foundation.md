# Phase 3 — Identity Layer and Authentication Foundation

## Scope and status

This phase establishes provider-neutral identity, session, and authorization boundaries. It does
not select, configure, or integrate a production authentication provider. The initial administrator
bootstrap remains internal and inactive.

## 1. Identity architecture

- `identityKey` is the canonical platform identity. It is opaque and cannot be a phone number,
  email address, provider subject, or provider user ID.
- `identities` maps one canonical `identityKey` to exactly one `userProfiles` record.
- `identityProviderLinks` stores a provider adapter key and a one-way hash of its validated subject.
  Raw provider subjects are not stored in the identity foundation.
- Provider links and identities can be revoked independently.
- Provisioning is an internal Convex mutation. Repeated provisioning of the same validated link is
  idempotent. Conflicting links and inconsistent identity/profile mappings are rejected.
- A newly provisioned profile always receives the `user` role. Authentication cannot grant
  administrative privileges.

## 2. Session architecture

- `identitySessions` stores only a token hash, never a bearer token.
- Sessions have independent access and refresh expiration timestamps.
- Validation rejects absent, revoked, expired, inactive-identity, and inactive-profile sessions.
- Refresh uses rotation: a new session is created and the old session is immediately revoked and
  linked to its replacement.
- Logout is modeled as an idempotent session revocation.
- Session functions are internal only. A future trusted HTTP/provider adapter must hash tokens and
  call them after validating provider evidence.

## 3. Adapter architecture

The frontend contract is `IdentityProviderAdapter`:

```text
Future provider SDK / protocol
            ↓
IdentityProviderAdapter
            ↓
IdentitySessionController
            ↓
Application
```

The contract exposes `signIn`, `signOut`, `getCurrentIdentity`, `refreshSession`, and
`validateSession`. No provider SDK type crosses this boundary. The default adapter is inactive and
returns an anonymous state; it does not create a user or bypass authentication.

The existing Convex Auth and browser-local implementations are temporary compatibility adapters.
They are not the production identity architecture. Business authorization uses the signed
`identityKey` claim through `convex/lib/authorization.ts`, not a provider-specific user ID.

## 4. Files changed

### Backend

- `convex/schema.ts`
- `convex/validators.ts`
- `convex/identity.ts`
- `convex/lib/authorization.ts`
- `convex/submissions.ts`
- `convex/notifications.ts`
- `convex/observability.ts`
- `convex/mediaSupport.ts`
- `convex/media.ts`
- `convex/propertyLocations.ts`
- `convex/universities.ts`

### Frontend and configuration

- `apps/web/src/identity/IdentityProviderAdapter.ts`
- `apps/web/src/identity/IdentitySessionController.ts`
- `apps/web/src/config/featureFlags.ts`
- `apps/web/src/auth/AuthServiceProvider.tsx`
- `.env.example`
- `.env.staging.example`
- `.env.production.example`

### Tests

- `convex/identity.integration.test.ts`
- `apps/web/src/identity/IdentitySessionController.test.ts`
- Existing admin, bootstrap, security, and submission integration tests were updated to use the
  signed canonical identity claim.

## 5. Identity flow

1. A future adapter authenticates the person with its provider.
2. The trusted adapter validates the provider response.
3. The adapter hashes the provider subject and supplies an opaque platform-generated `identityKey`.
4. Internal provisioning finds or creates exactly one identity/profile mapping and links the
   validated provider subject.
5. The adapter issues application credentials containing the signed canonical `identityKey`.
6. Server-side authorization resolves the active profile by `identityKey`.

No phone, email, or provider identifier is used for authorization or bootstrap.

## 6. Session flow

1. A trusted adapter creates an access token and sends only its hash to internal session storage.
2. Validation checks status, access expiry, canonical identity status, and profile status.
3. Refresh creates a replacement session and revokes the previous session atomically.
4. Logout revokes the current session. The frontend controller clears local session state even if
   remote logout reports an error.
5. Missing or invalid sessions resolve to an unauthorized/anonymous state and create no records.

## 7. Security validation

- Identity provisioning and session mutation functions are internal, not public API functions.
- Provider subjects and bearer tokens are not stored in plaintext.
- Canonical identities, provider links, and token hashes are uniqueness-checked.
- Business authorization remains server-side and resolves active profiles from a signed claim.
- New identities always receive the lowest platform role.
- Admin bootstrap remains provider-neutral, internal, one-time, and inactive.
- Local legacy authentication is disabled unconditionally in production builds, even if its
  environment flag is mistakenly set.
- Staging and production templates disable local authentication and all temporary/provider-specific
  authentication switches.

## 8. Test results

At completion:

- TypeScript project typecheck: passed.
- Convex integration tests: 9 files, 32 tests passed.
- Identity tests cover idempotent mapping, duplicate rejection, default role, session validation,
  rotation, expiration, revocation, and unauthorized absence.
- Frontend controller tests cover validation, expiration, refresh, and logout state clearing.

Final lint, complete workspace tests, build, environment validation, and Convex deployment
validation are recorded in the handoff response.

## 9. Remaining risks

- The production provider is intentionally absent, so no production sign-in path exists yet.
- A future adapter must generate unpredictable `identityKey` values, hash provider subjects with a
  server-held pepper, and hash session tokens before calling internal functions.
- The future token verifier must cryptographically guarantee the `identityKey` claim. Client-sent
  identity data is never sufficient.
- Existing records that predate canonical identities need an explicit, reviewed migration only
  after the final provider supplies verified identities.
- Account linking, unlinking, recovery, MFA, credential compromise response, device/session
  management, and provider webhook handling remain provider-integration work.
- Revoked/expired session cleanup needs a scheduled internal maintenance job after production
  session retention requirements are defined.

## 10. Final provider recommendations

Select a provider only after confirming:

- Standards-based server verification and stable subject semantics.
- A secure way to carry or resolve the platform `identityKey` without exposing provider IDs to
  business logic.
- Strong MFA and account recovery appropriate for Saudi users and property owners.
- Session revocation, key rotation, audit events, webhook verification, and incident response.
- Support for consent, privacy, data residency, retention, and applicable Saudi regulations.
- Reliable development, staging, and production tenant separation.
- A clear adapter implementation that passes the same identity/session contract tests without
  changing application workflows.

No recommendation in this phase assumes Convex Auth, Nafath, Google, Microsoft, or OpenID Connect.

## Phase boundary

Phase 4 has not started. No admin dashboard, property workflow, payment gateway, booking, or
production authentication work is included here.
