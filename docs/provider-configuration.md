# Provider Configuration Baseline

## Purpose

Saknaha must avoid vendor lock-in. Third-party providers are implementation details behind typed adapters, environment configuration, and feature flags.

## Defaults

- Auth: Convex Auth.
- Media storage: Convex Storage.
- Maps: OpenStreetMap/OSRM for non-paid defaults; Google Maps preferred when configured and paid calls are enabled; Mapbox available as an alternate.
- SMS: disabled by default; Msegat, Taqny, and Twilio available when configured.
- Monitoring: Sentry disabled by default.
- Analytics: PostHog disabled by default.

## Provider Adapter Rules

- Provider calls happen from server-side functions or actions unless a provider explicitly requires a public browser key.
- Browser-exposed keys must be restricted by domain, API scope, quota, and provider-side billing limits.
- Secrets are stored in Convex/Vercel/provider environment configuration, never in source.
- Adapters return normalized domain results, not provider-native response objects.
- Each adapter must include timeout handling, error normalization, cost metadata where available, and test doubles.

## Maps Adapter

Normalized capabilities:

- geocode,
- reverse geocode,
- autocomplete,
- nearby search,
- marker data normalization,
- clustering input,
- route calculation,
- usage/cost event recording.

Providers:

- `google`: Google Maps Platform.
- `mapbox`: Mapbox APIs.
- `openstreetmap`: OpenStreetMap/Nominatim/OSRM-compatible services.

Production rules:

- Paid calls require `maps.paidCalls.enabled`.
- Geocoding and routing results should be cached in Convex.
- API keys must have provider-side quota and domain restrictions.
- Provider failures should degrade to cached results or a clear unavailable state.

## SMS Adapter

Normalized capabilities:

- send OTP,
- send notification,
- query delivery status when provider supports it,
- retry with idempotency key,
- record usage and estimated cost.

Providers:

- `msegat`,
- `taqny`,
- `twilio`,
- `disabled`.

Production rules:

- OTP challenges expire.
- Phone OTP remains optional and disabled until the business enables it.
- Abuse prevention must include per-phone, per-IP, per-user, and per-tenant rate limits.
- Provider switching must require configuration only.

## Storage Adapter

Default provider:

- `convex`: Convex Storage.

Future providers:

- `awsS3`,
- `cloudflareR2`.

Normalized capabilities:

- create upload target,
- validate metadata,
- attach file to domain record,
- serve approved media,
- delete or quarantine media,
- record storage usage and estimated cost.

Production rules:

- Media is not public until validation and scan state allow it.
- Upload metadata is stored in Convex.
- Orphan cleanup is required before production launch.
- Future S3/R2 adapters must preserve the same media metadata contract.

## Monitoring And Analytics

Sentry:

- captures frontend errors,
- captures server/action failures where supported,
- tracks release health and performance traces,
- redacts PII.

PostHog:

- captures privacy-safe product events,
- tracks funnels and feature adoption,
- respects user privacy and consent requirements.

Analytics events must use stable names and avoid raw phone numbers, emails, addresses, license numbers, or free-form user content.

## Cost Usage Providers

The admin cost dashboard needs normalized usage events:

- provider name,
- capability,
- tenant ID when applicable,
- request count,
- success/failure,
- measured units,
- estimated cost,
- currency,
- timestamp.

Early milestones may estimate costs from local counters. Later milestones should reconcile with provider billing exports or APIs where available.
