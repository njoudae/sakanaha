# Convex Foundation

## Scope

M4 adds the Convex foundation only. It does not implement authentication, SMS, maps, media processing, notifications, monitoring, or the admin dashboard.

## Backend Files

- `convex/schema.ts`: strict single-platform schema based on the approved database design.
- `convex/validators.ts`: shared Convex validators for roles, statuses, channels, scopes, and provider metadata.
- `convex/migrations.ts`: localStorage export validation and dry-run summary functions aligned with M3.
- `convex/seed.ts`: seed manifest validation boundary for future import tooling.
- `convex/_generated/*`: generated type boundary files following Convex's dynamic generated shape.

## Codegen

The installed Convex CLI requires `CONVEX_DEPLOYMENT` before `convex codegen` can run. After a deployment is selected with `npx convex dev`, regenerate the checked-in generated files with:

```sh
npm run convex:codegen
```

## Frontend Boundary

The web app remains on localStorage by default. Convex data access is gated by:

- `VITE_FEATURE_DATA_CONVEX_ENABLED`
- `VITE_CONVEX_URL`

If the Convex flag is not enabled, no Convex client is created. If the flag is enabled without `VITE_CONVEX_URL`, the client boundary throws before making provider calls.

## Rollback

Rollback is documentation and file-level only in M4:

- disable `VITE_FEATURE_DATA_CONVEX_ENABLED`,
- remove Convex scripts and frontend boundary imports if needed,
- leave localStorage services untouched,
- do not delete localStorage data.
