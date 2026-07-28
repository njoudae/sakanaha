# Convex Foundation

## Scope

Convex is the sole production source for properties, bookings, favorites, roommate cards, user
profiles, moderation, payments, notifications, and audit records.

## Backend Files

- `convex/schema.ts`: strict single-platform schema based on the approved database design.
- `convex/validators.ts`: shared Convex validators for roles, statuses, channels, scopes, and provider metadata.
- `convex/seed.ts`: seed manifest validation boundary for future import tooling.
- `convex/_generated/*`: generated type boundary files following Convex's dynamic generated shape.

## Codegen

The installed Convex CLI requires `CONVEX_DEPLOYMENT` before `convex codegen` can run. After a deployment is selected with `npx convex dev`, regenerate the checked-in generated files with:

```sh
npm run convex:codegen
```

## Frontend Boundary

Convex data access is gated by:

- `VITE_FEATURE_DATA_CONVEX_ENABLED`
- `VITE_CONVEX_URL`

Production keeps the Convex data flag enabled. If it is disabled or the deployment URL is absent,
business actions remain unavailable; the app does not fall back to mock or browser-stored data.

## Rollback

Rollback is documentation and file-level only in M4:

- roll back the complete release commit and Convex deployment together,
- do not enable a browser-storage or mock-data compatibility path,
- keep provider-specific authentication and payment integration disabled until their approved phases.
