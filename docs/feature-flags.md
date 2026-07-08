# Feature Flag Baseline

## Purpose

Feature flags control staged rollout, rollback, provider switching, and production risk. Every major production module must be gated before it affects users.

## Flag Principles

- Flags are typed and centrally documented.
- Defaults must be safe for the current repository state.
- Production provider calls are disabled unless explicitly enabled.
- Flags must be readable on the server for authorization-sensitive behavior.
- Frontend flags may hide UI, but server flags must enforce behavior.
- Removing a flag requires a cleanup task after the feature is stable.

## Flag Classes

- `release`: controls whether a feature is visible or active.
- `provider`: selects an adapter implementation.
- `ops`: enables diagnostics, admin tooling, or operational workflows.
- `migration`: controls staged migration and dual-read or dual-write behavior.
- `killSwitch`: immediately disables risky external effects.

## Initial Flags

| Flag                              | Class      | Default         | Purpose                                                                      |
| --------------------------------- | ---------- | --------------- | ---------------------------------------------------------------------------- |
| `auth.convexAuth.enabled`         | release    | `false`         | Enables Convex Auth integration.                                             |
| `auth.google.enabled`             | release    | `false`         | Enables Google Login.                                                        |
| `auth.emailOtp.enabled`           | release    | `false`         | Enables Email OTP.                                                           |
| `auth.phoneOtp.enabled`           | release    | `false`         | Enables optional Phone OTP.                                                  |
| `auth.apple.enabled`              | release    | `false`         | Keeps Apple Sign In disabled by default.                                     |
| `data.convex.enabled`             | migration  | `false`         | Reads production data from Convex.                                           |
| `data.localStorageExport.enabled` | migration  | `true`          | Allows users/dev tools to export current localStorage data before migration. |
| `data.dualRead.enabled`           | migration  | `false`         | Allows controlled fallback reads during migration.                           |
| `data.dualWrite.enabled`          | migration  | `false`         | Allows controlled writes to old and new stores during migration.             |
| `maps.enabled`                    | release    | `false`         | Enables production maps module.                                              |
| `maps.provider`                   | provider   | `openstreetmap` | Selects `google`, `mapbox`, or `openstreetmap`.                              |
| `maps.paidCalls.enabled`          | killSwitch | `false`         | Enables paid provider calls.                                                 |
| `sms.enabled`                     | release    | `false`         | Enables SMS delivery.                                                        |
| `sms.provider`                    | provider   | `disabled`      | Selects `msegat`, `taqny`, `twilio`, or `disabled`.                          |
| `media.convexStorage.enabled`     | release    | `false`         | Enables Convex Storage uploads.                                              |
| `media.processing.enabled`        | release    | `false`         | Enables thumbnail/compression/scan state processing.                         |
| `notifications.enabled`           | release    | `false`         | Enables notification creation and delivery.                                  |
| `notifications.queue.enabled`     | release    | `false`         | Enables queued background notification delivery.                             |
| `monitoring.sentry.enabled`       | ops        | `false`         | Enables Sentry reporting.                                                    |
| `analytics.posthog.enabled`       | ops        | `false`         | Enables PostHog events.                                                      |
| `admin.costDashboard.enabled`     | ops        | `false`         | Enables cost dashboard.                                                      |
| `backup.restoreTools.enabled`     | ops        | `false`         | Enables restricted restore tooling.                                          |

## Configuration Shape

The implementation milestone should introduce a typed configuration module with these concepts:

```ts
type ProviderName =
  "disabled" | "google" | "mapbox" | "openstreetmap" | "msegat" | "taqny" | "twilio" | "convex";

interface FeatureFlag<TValue = boolean> {
  key: string;
  defaultValue: TValue;
  description: string;
  owner: "engineering" | "operations" | "product" | "security";
  expiresAfter?: string;
}
```

The exact file location belongs to M2/M4, once package boundaries and Convex are in place.

## Rollout Rules

- Start with server-side disabled defaults.
- Enable first in local development, then staging, then production.
- Use cohort or tenant-based rollout for data, auth, maps, media, and notifications.
- Keep kill switches independent from provider selection.
- Log all production flag changes in audit events once audit logging exists.

## Rollback Rules

- Disable the module flag before changing provider credentials.
- For paid providers, disable the paid-call kill switch first.
- For migration flags, stop writes before changing reads.
- For auth flags, keep at least one tested login method enabled in staging before production rollout.
