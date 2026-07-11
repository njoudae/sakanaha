# Production Readiness Report

This report reflects the repository state after M9 and before the next implementation milestone.

## Ready

- Monorepo quality gates: lint, typecheck, test, and build scripts exist.
- Vercel frontend deployment shape exists in `vercel.json`.
- Convex backend folder, schema, generated type boundary, and deployment scripts exist.
- Convex Auth foundation exists behind `AuthService`.
- Google Login architecture is implemented behind feature flags.
- Email OTP architecture is implemented behind feature flags and a secure webhook boundary.
- Phone OTP architecture is implemented behind feature flags and `SmsProvider`.
- SMS provider abstraction exists for Msegat, Taqny, and Twilio.
- SMS idempotency, hashed destination storage, retry policy, provider health, failover, and emergency kill switch are implemented.
- Maps provider abstraction exists for Google Maps, Mapbox, and OpenStreetMap/OSRM.
- Maps geocoding, reverse geocoding, route calculation, travel-time calculation, caching, health, and fallback behavior exist at the provider/server boundary.
- Feature flag baseline is documented.
- Data migration strategy from localStorage to Convex is documented.

## Partially Ready

- Convex data layer exists, but application pages still primarily use localStorage compatibility flows.
- Auth UI is abstracted through `AuthService`, but production rollout depends on correct Convex Auth and provider environment setup.
- Email OTP depends on an external webhook; a native email provider adapter is not implemented yet.
- Phone OTP is server-side and provider-backed, but per-IP rate limiting is fully effective only after a trusted edge proxy or BFF supplies `ipHash`.
- Google Maps is implemented server-side, but the visible map UI still has legacy/mock-compatible behavior in places.
- Provider cost events exist for SMS and maps, but the admin cost dashboard is not implemented yet.
- Convex Storage is selected as the default storage provider, but the secure media upload pipeline is not implemented yet.

## Still Mocked Or Compatibility-Based

- Property creation remains on the current frontend/localStorage compatibility path.
- Property search remains on current frontend/localStorage compatibility data unless Convex data adapters are connected in a later milestone.
- Favorites remain on current frontend/localStorage compatibility data unless Convex data adapters are connected in a later milestone.
- Roommate matching remains on current frontend/localStorage compatibility data unless Convex data adapters are connected in a later milestone.
- Owner dashboard remains on current frontend/localStorage compatibility data unless Convex data adapters are connected in a later milestone.
- Admin dashboard is not implemented.
- Media upload, scanning, compression, and thumbnails are not implemented.
- Push notifications, in-app notifications, queued jobs, Sentry, and PostHog are not implemented.

## Requires External Accounts

- Vercel for frontend staging and production hosting.
- Convex Cloud for backend staging and production deployments.
- Google Cloud for OAuth.
- Google Cloud with Maps Platform enabled for paid maps testing.
- Email OTP provider or secure webhook endpoint.
- Msegat for primary SMS.
- Taqny and Twilio if fallback SMS providers will be tested.
- DNS provider for staging and production hostnames.

Future external accounts:

- Sentry for monitoring.
- PostHog for analytics.
- Apple Developer account for Apple Sign In.

## Cannot Yet Be Fully Tested

- Convex-backed property CRUD from production pages.
- Convex-backed favorites and roommate matching from production pages.
- Admin dashboard.
- Cost dashboard.
- Secure media upload pipeline.
- Backup and disaster recovery drills.
- Monitoring and analytics pipelines.
- Push/in-app notification delivery.
- Final Lighthouse >95 production performance target.
- Full security audit remediation from M15.

## Staging Test Scope Now

After configuring staging accounts and environment variables, the following can be tested:

- App deployment on Vercel.
- Convex deployment health.
- Convex Auth client wiring.
- Google Login.
- Email OTP through the configured webhook.
- Phone OTP through Msegat, if enabled.
- SMS emergency kill switch.
- Maps server actions with Google Maps, Mapbox, or OpenStreetMap according to configuration.
- Current property creation/search/favorites/roommate/owner dashboard flows through compatibility storage.

## Recommendation

Deploy staging with conservative flags first:

- Enable Convex Auth only after `VITE_CONVEX_URL` and Convex Auth server variables are set.
- Enable Google Login first.
- Enable Email OTP second.
- Enable Phone OTP only during controlled test windows.
- Keep Convex data disabled until the data adapter milestone connects pages to backend data.
- Keep SMS emergency kill switch documented for immediate rollback.
