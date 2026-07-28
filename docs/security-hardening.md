# M16 security hardening

## Security boundaries

Convex public functions are internet-callable and enforce identity, active-profile status, role,
resource ownership, and record ownership on the server. Frontend route guards and feature flags are
usability controls only; they are not authorization boundaries.

| Role               | Effective server-side access                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `admin`            | Global audit and usage visibility, property/media moderation, and exact managed locations.                    |
| `owner`            | Only properties linked through the active owner profile and media uploaded by or attached to that owner.      |
| `user`             | Own profile, university preference, notifications, analytics submission, and unattached uploads they created. |
| `service_provider` | Standard authenticated self-service only; no administrative or owner privilege is implied.                    |
| `support`          | Sanitized audit events only; no raw usage analytics, actor IDs, target IDs, or Convex document IDs.           |
| `moderator`        | Sanitized audit events and existing property/media moderation; no raw usage analytics.                        |

Global role assignments must have `status: "active"`. Scoped assignments do not grant global
observability access. Role changes and revocation remain data-administration operations; M16 does not
add a new role-management API or schema.

## Implemented controls

- Unauthenticated clients cannot create authentication audit records. Authenticated client records
  are attributed to the active profile, rate-limited, bounded, and stripped of email, phone, and
  common query-secret values.
- Raw usage analytics are admin-only. Support and moderator audit output omits internal record,
  actor, and target identifiers.
- Provider override and email webhook URLs must be public HTTPS URLs without embedded credentials,
  fragments, localhost names, private IPv4 literals, or local/internal hostnames.
- Email OTP and notification webhook delivery require bearer authentication, carry deterministic
  idempotency keys, and fail closed if the secret is absent.
- Map coordinates, query lengths, control characters, locale tags, and region codes are validated
  before provider calls. Existing provider quota and circuit-breaker controls remain active.
- Production responses set CSP, anti-framing, MIME-sniffing, referrer, and browser permission
  policies. External links opened in a new tab retain `noopener noreferrer`.
- Convex Storage upload reservations, stored MIME/size verification, thumbnails, attachment
  ownership, signed access, and orphan cleanup remain unchanged and server-enforced.
- The package lock pins the patched `esbuild` release used through Vite.

## Operational requirements

- Production must use Convex Auth; the local-storage mode is a demo/development fallback and never
  grants Convex backend authority.
- Keep all provider credentials in Convex/Vercel server environment variables. Only explicitly
  public `VITE_` values may enter the browser bundle.
- Rotate webhook secrets if delivery logs or provider systems are exposed. Provider endpoints must
  validate the bearer token before accepting a message.
- Review admin/support/moderator assignments regularly and revoke them by setting assignment status
  inactive.

## Intentional residual risk

- Route and travel-time map actions remain public to preserve approved guest directions. Global
  provider quotas cap spend, but direct Convex actions do not expose a trustworthy client IP for
  per-IP throttling. An edge gateway/WAF is the recommended additional control if abuse is observed.
- CSP permits HTTPS image and connection destinations because approved storage, maps, monitoring,
  and analytics providers are environment-selectable. Restricting hosts further requires a complete
  deployment-specific origin allowlist.
- URL validation blocks direct local/private destinations but cannot independently prevent DNS
  rebinding. Provider endpoint environment variables are trusted operator configuration; production
  egress policy should also deny metadata and private-network ranges.
- The frozen role-assignment schema has status-based revocation but no assignment expiry timestamp.
  Time-limited privileged access requires an operational revocation process until a separately
  approved schema change is available.
- No application-owned inbound provider webhook exists in M16. Inbound signature verification is
  therefore not applicable; outbound email webhooks use required bearer authentication and message
  idempotency keys.
