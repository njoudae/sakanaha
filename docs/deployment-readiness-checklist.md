# Deployment Readiness Checklist

Use this checklist before deploying Saknaha to staging or production.

## Repository

- [ ] Working tree contains only reviewed changes.
- [ ] No secrets are committed.
- [ ] `.env.example`, `.env.staging.example`, and `.env.production.example` are present.
- [ ] `vercel.json` points to `apps/web/dist`.
- [ ] Convex functions are present under `convex`.
- [ ] Documentation is updated for the current feature flags and providers.

## Quality Gates

- [ ] `npm install` succeeds.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Known warnings are documented before deployment.

## Accounts And Access

- [ ] GitHub repository access confirmed.
- [ ] Vercel project access confirmed.
- [ ] Convex project access confirmed.
- [ ] Google Cloud project access confirmed.
- [ ] Email OTP delivery account or webhook confirmed.
- [ ] SMS provider account confirmed.
- [ ] DNS provider access confirmed.

## Environments

- [ ] Staging and production use separate Convex deployments.
- [ ] Staging and production use separate Google OAuth clients.
- [ ] Staging and production use separate SMS credentials.
- [ ] Staging and production use separate provider quotas and billing alerts.
- [ ] Vercel frontend variables contain only `VITE_` public values.
- [ ] Convex server variables contain all private provider secrets.

## Security

- [ ] OAuth secrets are stored only in Convex environment variables.
- [ ] SMS credentials are stored only in Convex environment variables.
- [ ] Google Maps server key is stored only in Convex environment variables.
- [ ] Email OTP webhook secret is configured.
- [ ] SMS emergency kill switch is documented and tested.
- [ ] Per-IP SMS limiting is enabled only with trusted edge/BFF `ipHash`.
- [ ] Browser/client-supplied IP values are not accepted.
- [ ] Staging domains are HTTPS-only.

## Providers

- [ ] Google OAuth configured.
- [ ] Email OTP webhook configured.
- [ ] Msegat configured for staging if Phone OTP is tested.
- [ ] Taqny and Twilio fallback credentials configured only if fallback testing is required.
- [ ] Google Maps API key configured with quotas and restrictions.
- [ ] OpenStreetMap user agent configured.

## Feature Flags

- [ ] `VITE_FEATURE_AUTH_CONVEX_AUTH_ENABLED=true` for staging auth tests.
- [ ] `VITE_FEATURE_AUTH_GOOGLE_ENABLED=true` for Google login tests.
- [ ] `VITE_FEATURE_AUTH_EMAIL_OTP_ENABLED=true` for Email OTP tests.
- [ ] `VITE_FEATURE_AUTH_PHONE_OTP_ENABLED=true` only when SMS is ready.
- [ ] `VITE_FEATURE_DATA_CONVEX_ENABLED=false` until Convex data adapters are connected to pages.
- [ ] `SAKNAHA_SMS_EMERGENCY_DISABLED=false` only during explicit SMS test windows.
- [ ] `SAKNAHA_MAPS_PAID_CALLS_ENABLED=true` only after Google Maps quota limits are active.

## Smoke Tests

- [ ] Staging app loads.
- [ ] Google Login can complete.
- [ ] Email OTP can complete.
- [ ] Phone OTP can complete when enabled.
- [ ] Maps geocoding/routing works.
- [ ] Property creation works.
- [ ] Property search works.
- [ ] Favorites work.
- [ ] Roommate matching works.
- [ ] Owner dashboard works.
- [ ] Admin dashboard skipped or tested, depending on implementation status.

## Rollback

- [ ] Vercel previous deployment rollback is available.
- [ ] Convex deployment rollback procedure is documented for the operator.
- [ ] SMS kill switch is tested.
- [ ] Maps paid-call kill switch is tested.
- [ ] Auth flags can disable incomplete login methods without redeploying frontend code.
