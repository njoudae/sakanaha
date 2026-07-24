# Deployment Readiness Checklist

Use this checklist before deploying Saknaha to staging or production.

## Repository

- [ ] Working tree contains only reviewed changes.
- [ ] No secrets are committed.
- [ ] `.env.example`, `.env.staging.example`, and `.env.production.example` are present.
- [ ] `vercel.json` points to `apps/web/dist`.
- [ ] Convex functions are present under `convex`.
- [ ] Documentation is updated for the current feature flags and providers.
- [ ] M17 changes were merged through a reviewed pull request.
- [ ] Vercel Git auto-deployments are disabled; GitHub Actions is the only deployment authority.
- [ ] `main` requires the Quality Gates status check.

## Quality Gates

- [ ] `npm install` succeeds.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run test:security` passes.
- [ ] `npm audit --audit-level=low` reports zero vulnerabilities.
- [ ] `npm run security:scan` passes.
- [ ] `npm run validate:environment` passes.
- [ ] `npm run validate:deployment -- --artifact` passes after the build.
- [ ] `npm run build` passes.
- [ ] `git diff --check` passes.
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
- [ ] Dedicated Vercel projects exist for staging and production.
- [ ] Dedicated Convex projects/deployments exist for staging and production.
- [ ] GitHub `staging` and `production` environments contain separate deployment secrets.
- [ ] Production requires an independent reviewer and prevents self-approval.
- [ ] `APP_HEALTH_URL` is the correct HTTPS alias in each GitHub environment.

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
- [ ] Admin, owner, and user dashboards load with their approved behavior.
- [ ] Media upload, thumbnail, cover, removal, and orphan-cleanup behavior is verified.
- [ ] Notification read state, preferences, email/SMS delivery, retry, and deep links are verified.
- [ ] Sentry release/error capture and PostHog privacy-safe events are verified when enabled.

## Rollback

- [ ] Vercel previous deployment rollback is available.
- [ ] Convex deployment rollback procedure is documented for the operator.
- [ ] SMS kill switch is tested.
- [ ] Maps paid-call kill switch is tested.
- [ ] Auth flags can disable incomplete login methods without redeploying frontend code.
- [ ] Last healthy release tag, Vercel deployment ID, and Convex audit entry are recorded.
- [ ] Operator can execute `vercel rollback` and redeploy the prior Convex release tag.
- [ ] Deployment failure recovery contacts and escalation paths are current.

## Release

- [ ] `package.json` version matches the intended semver tag.
- [ ] Production workflow input uses the full staging-verified 40-character SHA.
- [ ] Staging deployment and manual smoke evidence are attached to the release decision.
- [ ] Production immutable URL and canonical alias pass automated health verification.
- [ ] Tag and GitHub release are created only after health checks pass.
- [ ] Production `.vercel/output` artifact is retained for 30 days.
- [ ] Post-release observation owner and duration are recorded.

## Backup And Recovery

- [ ] Production periodic Convex backups are enabled and include file storage.
- [ ] The latest external ZIP and manifest pass `npm run backup:validate`.
- [ ] Backup artifacts are encrypted, access-controlled, immutable/versioned, and outside the repository.
- [ ] A quarterly isolated restore drill has passed within the documented RPO/RTO.
- [ ] The current release has a validated pre-release recovery point.
- [ ] Code revision and secret-manager configuration can be recovered independently of Convex data.
- [ ] Two authorized operators know the production restore approval and confirmation workflow.
