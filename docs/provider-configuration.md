# Provider Configuration Baseline

## Purpose

Saknaha must avoid vendor lock-in. Third-party providers are implementation details behind typed adapters, environment configuration, and feature flags.

## Defaults

- Auth: Convex Auth.
- Media storage: Convex Storage.
- Maps: OpenStreetMap/OSRM for non-paid defaults; Google Maps preferred when configured and paid calls are enabled; Mapbox available as an alternate.
- SMS: Msegat selected by default but delivery disabled by default; Msegat, Taqny, and Twilio available when configured.
- Monitoring: Sentry disabled by default.
- Analytics: PostHog disabled by default.

## Provider Adapter Rules

- Provider calls happen from server-side functions or actions unless a provider explicitly requires a public browser key.
- Browser-exposed keys must be restricted by domain, API scope, quota, and provider-side billing limits.
- Secrets are stored in Convex/Vercel/provider environment configuration, never in source.
- Adapters return normalized domain results, not provider-native response objects.
- Each adapter must include timeout handling, error normalization, cost metadata where available, and test doubles.

## Implemented Abstraction Package

M6 introduces `@saknaha/providers` as the shared provider contract package. It contains:

- typed provider names and capability contracts,
- normalized request and response shapes,
- provider configuration resolution from environment-like values,
- a registry resolver that rejects enabled providers without registered adapters,
- no network behavior and no placeholder third-party implementations.

The package currently defines contracts for:

- maps: Google, Mapbox, OpenStreetMap, or disabled,
- SMS: Msegat, Taqny, Twilio, or disabled,
- email: webhook, Resend future adapter, or disabled,
- push: Web Push, Firebase future adapter, or disabled,
- analytics: PostHog or disabled,
- monitoring: Sentry or disabled,
- storage: Convex Storage, AWS S3 future adapter, Cloudflare R2 future adapter, or disabled,
- cost usage: Convex usage events or disabled.

Concrete adapters must implement these interfaces in later milestones. Application pages and domain logic should depend on normalized contracts, not provider-native SDKs or response shapes.

## Configuration Keys

Provider selection:

- `SAKNAHA_MAPS_PROVIDER`: `google`, `mapbox`, `openstreetmap`, or `disabled`. Default `google`.
- `SAKNAHA_SMS_ENABLED`: enables SMS delivery when `true`. Default `false`.
- `SAKNAHA_SMS_PROVIDER`: `msegat`, `taqny`, `twilio`, or `disabled`. Default selected provider `msegat`.
- `SAKNAHA_SMS_FALLBACK_PROVIDERS`: comma-separated fallback provider order. Default `taqny,twilio`.
- `SAKNAHA_EMAIL_PROVIDER`: `webhook`, `resend`, or `disabled`. Default `webhook`.
- `SAKNAHA_PUSH_PROVIDER`: `webpush`, `firebase`, or `disabled`. Default `disabled`.
- `SAKNAHA_ANALYTICS_PROVIDER`: `posthog` or `disabled`. Default `disabled`.
- `SAKNAHA_MONITORING_PROVIDER`: `sentry` or `disabled`. Default `disabled`.
- `SAKNAHA_STORAGE_PROVIDER`: `convex`, `awsS3`, `cloudflareR2`, or `disabled`. Default `convex`.
- `SAKNAHA_COST_PROVIDER`: `convex` or `disabled`. Default `convex`.

Operational controls:

- `SAKNAHA_MAPS_PAID_CALLS_ENABLED`: enables paid maps calls. Default `false`.
- `SAKNAHA_MAPS_CACHE_TTL_SECONDS`: maps cache TTL. Default 30 days.
- `SAKNAHA_MAPS_QUOTA_PER_MINUTE`: server-side provider rate-limit budget. Default `60`.
- `SAKNAHA_MAPS_CIRCUIT_BREAKER_FAILURE_THRESHOLD`: failures before circuit opens. Default `3`.
- `SAKNAHA_MAPS_CIRCUIT_BREAKER_COOLDOWN_MS`: circuit cooldown duration. Default 5 minutes.
- `SAKNAHA_SMS_RETRY_COUNT`: SMS retry count. Default `3`.
- `SAKNAHA_SMS_OTP_TTL_SECONDS`: SMS OTP TTL. Default 10 minutes.
- `SAKNAHA_SMS_HOURLY_LIMIT`: global hourly SMS send cap. Default `100`.
- `SAKNAHA_SMS_DAILY_LIMIT`: global daily SMS send cap. Default `500`.
- `SAKNAHA_SMS_PER_USER_HOURLY_LIMIT`: per-phone hourly SMS send cap. Default `5`.
- `SAKNAHA_SMS_PER_USER_DAILY_LIMIT`: per-phone daily SMS send cap. Default `20`.
- `SAKNAHA_SMS_PER_IP_HOURLY_LIMIT`: per-IP hourly SMS send cap when `ipHash` is supplied. Default `20`.
- `SAKNAHA_SMS_PER_IP_DAILY_LIMIT`: per-IP daily SMS send cap when `ipHash` is supplied. Default `100`.
- `SAKNAHA_SMS_DESTINATION_ACCOUNT_HOURLY_LIMIT`: distinct known-account cap for one destination hash. Default `3`.
- `SAKNAHA_SMS_RETRY_BASE_DELAY_MS`: initial retry backoff delay. Default `500`.
- `SAKNAHA_SMS_RETRY_MAX_DELAY_MS`: maximum retry backoff delay. Default `30000`.
- `SAKNAHA_SMS_EMERGENCY_DISABLED`: global emergency kill switch. Default `false`.
- `SAKNAHA_SMS_FAILURE_RATE_DISABLE_THRESHOLD`: failure-rate threshold for provider circuit opening. Default `0.5`.
- `SAKNAHA_SMS_HEALTH_MINIMUM_SAMPLE_SIZE`: minimum health samples before automatic provider disablement. Default `5`.
- `SAKNAHA_SMS_HEALTH_WINDOW_SIZE`: bounded health sample window. Default `50`.
- `SAKNAHA_SMS_CIRCUIT_BREAKER_COOLDOWN_MS`: provider circuit cooldown. Default 5 minutes.
- `SAKNAHA_STORAGE_MAX_UPLOAD_BYTES`: max upload size. Default 10 MB.

## Maps Adapter

Normalized capabilities:

- geocode,
- reverse geocode,
- autocomplete,
- nearby search,
- marker data normalization,
- clustering input,
- route calculation,
- travel-time calculation,
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
- Phone OTP remains optional and disabled until both auth phone OTP and server-side SMS delivery are enabled.
- Abuse prevention must include per-phone and global SMS limits in M8, with per-IP and additional actor limits planned for later authorization and edge-protection milestones.
- Provider switching must require configuration only.
- Application code must call SMS through `SmsProvider` and the internal Convex SMS action, never through vendor SDKs or direct HTTP calls.
- Provider health records response time, failure rate, and delivery success rate. Temporary provider failures can fail over to configured fallback providers.
- Per-IP SMS limits require a trusted `ipHash` from an edge proxy or BFF. Browser/client-supplied IP values must not be accepted.

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
- user, owner profile, service provider profile, property, service offering, or region context when applicable,
- request count,
- success/failure,
- measured units,
- estimated cost,
- currency,
- timestamp.

Early milestones may estimate costs from local counters. Later milestones should reconcile with provider billing exports or APIs where available.
