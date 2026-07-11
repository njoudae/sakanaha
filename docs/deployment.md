# Saknaha Deployment Guide

This guide prepares Saknaha for a real staging deployment without deploying automatically.

## Deployment Targets

- Frontend: Vercel, serving `apps/web`.
- Backend: Convex Cloud, serving `convex`.
- Local compatibility: existing localStorage flows remain available while Convex flags are disabled.

## Required Accounts

Create or confirm access to:

- GitHub repository access for Vercel import and future CI/CD.
- Vercel team/project for the frontend.
- Convex team/project for staging and production backend deployments.
- Google Cloud project for Google OAuth and Google Maps Platform.
- Email OTP delivery provider or secure internal webhook endpoint.
- SMS provider account: Msegat primary; Taqny and Twilio optional fallbacks.
- Domain/DNS provider for staging and production hostnames.

Planned but not yet required by runtime code:

- Sentry account for monitoring.
- PostHog account for analytics.
- Apple Developer account for Apple Sign In, disabled by default until product requirements exist.

## DNS Requirements

Use separate hostnames for staging and production:

- Staging frontend: `staging.saknaha.example`
- Production frontend: `saknaha.example` or `www.saknaha.example`
- Convex HTTP/Auth site URL: the Convex deployment site URL assigned by Convex Cloud.

DNS checklist:

- Point frontend hostnames to Vercel.
- Configure Vercel custom domains and verify ownership.
- Add Google OAuth authorized JavaScript origins for frontend domains.
- Add Google OAuth redirect/callback URLs required by Convex Auth.
- Keep staging and production OAuth credentials separated.

## Local Development Setup

1. Install dependencies:

```sh
npm install
```

2. Copy the local template:

```sh
cp .env.example .env.local
```

3. Start Convex for local development when backend work is needed:

```sh
npm run convex:dev
```

4. Start the frontend:

```sh
npm run dev
```

5. Run quality gates:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

## Staging Deployment Setup

### Convex Cloud

1. Create a dedicated Convex deployment for staging.
2. Configure Convex environment variables from `.env.staging.example`.
3. Run Convex codegen after the deployment is selected:

```sh
npm run convex:codegen
```

4. Deploy Convex functions from the repository using the Convex CLI.
5. Copy the staging Convex client URL into Vercel as `VITE_CONVEX_URL`.
6. Copy the Convex site URL into Convex as `CONVEX_SITE_URL`.

### Vercel

Project settings:

- Framework preset: Vite.
- Install command: `npm install`.
- Build command: `npm run build`.
- Output directory: `apps/web/dist`.
- Root directory: repository root.

Environment:

- Add frontend variables from `.env.staging.example` to the Vercel staging environment.
- Do not add SMS, OAuth secrets, provider private keys, or Convex server secrets to public frontend variables.

## Production Deployment Setup

Production must use separate external-provider projects or credentials from staging.

1. Create a production Convex deployment.
2. Create a production Vercel project or production environment on the same project.
3. Configure production DNS.
4. Configure production Google OAuth credentials.
5. Configure production Google Maps quotas and billing alerts.
6. Configure production email/SMS credentials.
7. Keep `SAKNAHA_SMS_EMERGENCY_DISABLED=false` only after SMS has been verified in staging.
8. Keep destructive or paid features disabled until their validation checklist passes.

## Google OAuth Setup

Create separate OAuth clients for staging and production.

Required configuration:

- Authorized JavaScript origins: staging and production frontend origins.
- Authorized redirect URLs: Convex Auth callback URL for each Convex deployment.
- Store client ID in `AUTH_GOOGLE_ID`.
- Store client secret in `AUTH_GOOGLE_SECRET`.

Frontend flags required for Google login testing:

- `VITE_FEATURE_AUTH_CONVEX_AUTH_ENABLED=true`
- `VITE_FEATURE_AUTH_GOOGLE_ENABLED=true`

## Convex Auth Setup

Required server-side Convex variables:

- `CONVEX_SITE_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_EMAIL_OTP_WEBHOOK_URL`
- `AUTH_EMAIL_OTP_WEBHOOK_SECRET`, optional but recommended
- `AUTH_PHONE_OTP_ENABLED`
- `JWT_PRIVATE_KEY`
- `JWKS`
- `SITE_URL`, if required by the active Convex Auth deployment setup

Security notes:

- Never expose OAuth secrets, JWT keys, JWKS private material, OTP webhook secrets, or SMS provider credentials to Vercel frontend variables.
- Browser auth tokens are currently browser-readable through Convex Auth client storage; keep XSS prevention critical.

## Google Maps Setup

Google Maps is the preferred paid provider, behind the maps provider abstraction.

Required setup:

- Enable billing in Google Cloud.
- Enable geocoding, reverse geocoding, places/autocomplete, nearby search, routes, and maps APIs required by the implementation.
- Restrict API keys by API scope and environment.
- Set quotas and billing alerts.
- Store server key as `GOOGLE_MAPS_API_KEY` in Convex, not in the frontend.

Staging maps flags:

- `SAKNAHA_MAPS_PROVIDER=google`
- `SAKNAHA_MAPS_PAID_CALLS_ENABLED=true`

Fallback:

- If Google credentials are missing or disabled, Mapbox can be used when configured.
- OpenStreetMap/OSRM remains the non-paid fallback where supported.

## Email Provider Setup

Current implementation sends Email OTP through a secure webhook.

Webhook requirements:

- HTTPS only.
- Accepts channel, destination, code, and expiry payload.
- Authenticated with `AUTH_EMAIL_OTP_WEBHOOK_SECRET` when configured.
- Must not log plaintext OTP codes.
- Must rate limit and monitor delivery failures.

Production email-provider adapter work remains future scope.

## SMS Provider Setup

Msegat is primary. Taqny and Twilio are interchangeable fallback adapters.

Required for phone OTP:

- `AUTH_PHONE_OTP_ENABLED=true`
- `SAKNAHA_SMS_ENABLED=true`
- `SAKNAHA_SMS_EMERGENCY_DISABLED=false`
- Provider credentials for the selected provider.

Provider credential variables:

- Msegat: `MSEGAT_USERNAME`, `MSEGAT_API_KEY`, `MSEGAT_SENDER`, optional `MSEGAT_ENDPOINT`
- Taqny: `TAQNY_BEARER_TOKEN`, `TAQNY_SENDER`, optional `TAQNY_ENDPOINT`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, optional `TWILIO_ENDPOINT`

Per-IP rate limiting becomes fully effective only when a trusted edge proxy or BFF provides `ipHash`. Do not accept client-supplied IP values.

## Feature Flags Required For Staging

Minimum staging backend/auth test:

- `VITE_FEATURE_AUTH_CONVEX_AUTH_ENABLED=true`
- `VITE_FEATURE_AUTH_GOOGLE_ENABLED=true`
- `VITE_FEATURE_AUTH_EMAIL_OTP_ENABLED=true`
- `VITE_FEATURE_AUTH_PHONE_OTP_ENABLED=true`, only after SMS credentials are configured
- `VITE_FEATURE_DATA_CONVEX_ENABLED=false`, until Convex data adapters are wired into pages
- `VITE_FEATURE_DATA_DUAL_READ_ENABLED=false`
- `VITE_FEATURE_DATA_DUAL_WRITE_ENABLED=false`

Provider flags:

- `SAKNAHA_MAPS_PROVIDER=google`
- `SAKNAHA_MAPS_PAID_CALLS_ENABLED=true`, only after Google Maps quotas are set
- `SAKNAHA_SMS_PROVIDER=msegat`
- `SAKNAHA_SMS_FALLBACK_PROVIDERS=taqny,twilio`
- `SAKNAHA_SMS_ENABLED=true`, only for SMS testing windows
- `SAKNAHA_SMS_EMERGENCY_DISABLED=false`, unless SMS must be stopped immediately

## Environment Variable Reference

Frontend public variables, Vercel:

| Variable                                | Required                            | Purpose                              |
| --------------------------------------- | ----------------------------------- | ------------------------------------ |
| `VITE_CONVEX_URL`                       | when Convex auth or data is enabled | Convex client URL.                   |
| `VITE_FEATURE_AUTH_CONVEX_AUTH_ENABLED` | yes for auth staging                | Enables Convex Auth client path.     |
| `VITE_FEATURE_AUTH_GOOGLE_ENABLED`      | yes for Google test                 | Enables Google login UI path.        |
| `VITE_FEATURE_AUTH_EMAIL_OTP_ENABLED`   | yes for Email OTP test              | Enables Email OTP UI path.           |
| `VITE_FEATURE_AUTH_PHONE_OTP_ENABLED`   | optional                            | Enables Phone OTP UI path.           |
| `VITE_FEATURE_DATA_CONVEX_ENABLED`      | optional                            | Enables Convex data client creation. |
| `VITE_FEATURE_DATA_DUAL_READ_ENABLED`   | optional                            | Future migration control.            |
| `VITE_FEATURE_DATA_DUAL_WRITE_ENABLED`  | optional                            | Future migration control.            |

Convex server variables:

| Variable                                         | Required            | Purpose                                             |
| ------------------------------------------------ | ------------------- | --------------------------------------------------- |
| `CONVEX_SITE_URL`                                | yes for Convex Auth | Auth issuer/site URL.                               |
| `AUTH_GOOGLE_ID`                                 | for Google login    | Google OAuth client ID.                             |
| `AUTH_GOOGLE_SECRET`                             | for Google login    | Google OAuth secret.                                |
| `AUTH_EMAIL_OTP_WEBHOOK_URL`                     | for Email OTP       | Secure email OTP delivery endpoint.                 |
| `AUTH_EMAIL_OTP_WEBHOOK_SECRET`                  | recommended         | Bearer secret for Email OTP webhook.                |
| `AUTH_PHONE_OTP_ENABLED`                         | for Phone OTP       | Server-side Phone OTP enablement.                   |
| `JWT_PRIVATE_KEY`                                | for Convex Auth     | JWT signing private key.                            |
| `JWKS`                                           | for Convex Auth     | JSON Web Key Set.                                   |
| `SITE_URL`                                       | conditional         | Site URL if required by Convex Auth setup.          |
| `SAKNAHA_MAPS_PROVIDER`                          | maps staging        | `google`, `mapbox`, `openstreetmap`, or `disabled`. |
| `SAKNAHA_MAPS_PAID_CALLS_ENABLED`                | maps staging        | Paid maps kill switch.                              |
| `SAKNAHA_MAPS_CACHE_TTL_SECONDS`                 | optional            | Maps cache TTL.                                     |
| `SAKNAHA_MAPS_QUOTA_PER_MINUTE`                  | optional            | Provider rate budget.                               |
| `SAKNAHA_MAPS_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | optional            | Maps failure threshold.                             |
| `SAKNAHA_MAPS_CIRCUIT_BREAKER_COOLDOWN_MS`       | optional            | Maps circuit cooldown.                              |
| `GOOGLE_MAPS_API_KEY`                            | for Google Maps     | Server-side Google Maps key.                        |
| `MAPBOX_ACCESS_TOKEN`                            | for Mapbox          | Server-side Mapbox token.                           |
| `OPENSTREETMAP_USER_AGENT`                       | recommended for OSM | Identifies Saknaha to OSM services.                 |
| `SAKNAHA_EMAIL_PROVIDER`                         | optional            | Email provider selector.                            |
| `SAKNAHA_SMS_ENABLED`                            | for Phone OTP SMS   | Enables SMS delivery.                               |
| `SAKNAHA_SMS_EMERGENCY_DISABLED`                 | yes                 | Global SMS kill switch.                             |
| `SAKNAHA_SMS_PROVIDER`                           | for SMS             | `msegat`, `taqny`, `twilio`, or `disabled`.         |
| `SAKNAHA_SMS_FALLBACK_PROVIDERS`                 | optional            | Comma-separated fallback order.                     |
| `SAKNAHA_SMS_RETRY_COUNT`                        | optional            | Retry attempts for temporary failures.              |
| `SAKNAHA_SMS_OTP_TTL_SECONDS`                    | optional            | OTP TTL.                                            |
| `SAKNAHA_SMS_HOURLY_LIMIT`                       | optional            | Global hourly SMS cap.                              |
| `SAKNAHA_SMS_DAILY_LIMIT`                        | optional            | Global daily SMS cap.                               |
| `SAKNAHA_SMS_PER_USER_HOURLY_LIMIT`              | optional            | Per-destination hourly cap.                         |
| `SAKNAHA_SMS_PER_USER_DAILY_LIMIT`               | optional            | Per-destination daily cap.                          |
| `SAKNAHA_SMS_PER_IP_HOURLY_LIMIT`                | optional            | Per-IP cap when trusted `ipHash` exists.            |
| `SAKNAHA_SMS_PER_IP_DAILY_LIMIT`                 | optional            | Per-IP daily cap when trusted `ipHash` exists.      |
| `SAKNAHA_SMS_DESTINATION_ACCOUNT_HOURLY_LIMIT`   | optional            | Cross-account destination abuse cap.                |
| `SAKNAHA_SMS_RETRY_BASE_DELAY_MS`                | optional            | SMS retry base delay.                               |
| `SAKNAHA_SMS_RETRY_MAX_DELAY_MS`                 | optional            | SMS retry max delay.                                |
| `SAKNAHA_SMS_FAILURE_RATE_DISABLE_THRESHOLD`     | optional            | Auto-disable threshold.                             |
| `SAKNAHA_SMS_HEALTH_MINIMUM_SAMPLE_SIZE`         | optional            | Minimum health samples.                             |
| `SAKNAHA_SMS_HEALTH_WINDOW_SIZE`                 | optional            | Bounded health window.                              |
| `SAKNAHA_SMS_CIRCUIT_BREAKER_COOLDOWN_MS`        | optional            | SMS provider cooldown.                              |
| `SAKNAHA_SMS_MSEGAT_ESTIMATED_COST`              | optional            | Msegat cost estimate.                               |
| `SAKNAHA_SMS_TAQNY_ESTIMATED_COST`               | optional            | Taqny cost estimate.                                |
| `SAKNAHA_SMS_TWILIO_ESTIMATED_COST`              | optional            | Twilio cost estimate.                               |
| `SAKNAHA_SMS_COST_CURRENCY`                      | optional            | SMS cost currency.                                  |
| `SAKNAHA_SMS_OTP_TEMPLATE`                       | optional            | Server-side OTP message template.                   |
| `MSEGAT_USERNAME`                                | for Msegat          | Msegat username.                                    |
| `MSEGAT_API_KEY`                                 | for Msegat          | Msegat API key.                                     |
| `MSEGAT_SENDER`                                  | for Msegat          | Msegat sender ID.                                   |
| `MSEGAT_ENDPOINT`                                | optional            | Msegat override endpoint.                           |
| `TAQNY_BEARER_TOKEN`                             | for Taqny           | Taqny bearer token.                                 |
| `TAQNY_SENDER`                                   | for Taqny           | Taqny sender ID.                                    |
| `TAQNY_ENDPOINT`                                 | optional            | Taqny override endpoint.                            |
| `TWILIO_ACCOUNT_SID`                             | for Twilio          | Twilio account SID.                                 |
| `TWILIO_AUTH_TOKEN`                              | for Twilio          | Twilio auth token.                                  |
| `TWILIO_FROM`                                    | for Twilio          | Twilio sender phone.                                |
| `TWILIO_ENDPOINT`                                | optional            | Twilio override endpoint.                           |
| `SAKNAHA_PUSH_PROVIDER`                          | optional            | Push provider selector, disabled today.             |
| `SAKNAHA_ANALYTICS_PROVIDER`                     | optional            | Analytics selector, disabled today.                 |
| `SAKNAHA_MONITORING_PROVIDER`                    | optional            | Monitoring selector, disabled today.                |
| `SAKNAHA_STORAGE_PROVIDER`                       | optional            | Storage selector, Convex default.                   |
| `SAKNAHA_STORAGE_MAX_UPLOAD_BYTES`               | optional            | Future upload size limit.                           |
| `SAKNAHA_COST_PROVIDER`                          | optional            | Cost usage provider selector.                       |

Local tooling variables:

| Variable            | Required         | Purpose                     |
| ------------------- | ---------------- | --------------------------- |
| `CONVEX_DEPLOYMENT` | local Convex CLI | Selected Convex deployment. |

## Provider Failure Behavior Verification

- Convex frontend client: throws early if Convex auth/data flag is enabled without `VITE_CONVEX_URL`.
- Google Maps: provider is not created without `GOOGLE_MAPS_API_KEY`; configured fallback providers are tried.
- Mapbox: provider is not created without `MAPBOX_ACCESS_TOKEN`; configured fallback providers are tried.
- OpenStreetMap: available without a secret, with `OPENSTREETMAP_USER_AGENT` recommended.
- Email OTP: fails closed if `AUTH_EMAIL_OTP_WEBHOOK_URL` is missing while Email OTP is enabled.
- SMS: disabled by default; emergency kill switch stops all SMS; missing provider credentials fail before sending; provider failures are retried/fail over only when classified temporary.
- Convex Storage/media: schema boundaries exist, but upload pipeline is not implemented yet.
- Sentry/PostHog: provider selectors exist, but integrations are not implemented yet.

## Deployment Validation Checklist

Pre-deployment:

- `npm install` succeeds.
- `npm run lint` passes or only known warnings remain.
- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes.
- `.env.staging.example` has been copied into real Vercel and Convex environment settings with secrets filled outside git.
- Convex deployment URL is set in Vercel as `VITE_CONVEX_URL`.

Staging smoke tests:

- App loads on staging domain over HTTPS.
- Google Login starts and returns through Convex Auth.
- Email OTP request reaches the webhook and verifies.
- Phone OTP sends through Msegat when SMS is enabled.
- Phone OTP can be stopped by `SAKNAHA_SMS_EMERGENCY_DISABLED=true`.
- Maps geocoding/routing works with Google Maps, then falls back when provider is disabled.
- Property creation still works through the current compatibility storage path.
- Property search works.
- Favorites work.
- Roommate matching pages work.
- Owner dashboard flows work.
- Admin dashboard test is skipped until implemented.

Production promotion:

- Staging validation checklist is complete.
- Production external-provider credentials are separate from staging.
- DNS and OAuth callbacks are verified.
- Provider quotas and billing alerts are active.
- Rollback switches are documented for the operator on duty.
