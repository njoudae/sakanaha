# Saknaha Monorepo

Scalable workspace for the Saknaha housing platform. The current React + Vite implementation lives in `apps/web`, with room prepared for future backend, mobile, and admin applications.

## Structure

```txt
housing/
  apps/
    web/       Current React + Vite app
    backend/   Placeholder for future API/backend service
    mobile/    Placeholder for future mobile app
    admin/     Placeholder for future admin app
  packages/
    shared-types/  Shared TypeScript domain models
    constants/     Shared constants and mock data
    ui/            Placeholder for shared UI components
    utils/         Shared framework-agnostic utilities
  turbo.json
  package.json
  tsconfig.base.json
```

## Development

From the repository root:

```bash
npm install
npm run dev
```

Build the web app:

```bash
npm run build
```

Run the complete production validation surface:

```bash
npm run lint
npm run typecheck
npm test
npm run test:security
npm audit --audit-level=low
npm run build
npm run validate:environment
npm run validate:deployment -- --artifact
```

Run a workspace command directly:

```bash
npm run dev -w @saknaha/web
npm run build -w @saknaha/web
```

## Monorepo Notes

- `apps/web` owns browser-only services such as local storage.
- `packages/shared-types` contains portable TypeScript models.
- `packages/constants` contains shared constants and mock data.
- `packages/utils` contains reusable utility functions.
- `packages/ui` is reserved for shared components once more applications need them.
- `turbo.json` keeps the project ready for Turborepo task orchestration without adding extra app-level complexity.

## Production Planning

Production architecture and rollout guidance lives in:

- `docs/architecture.md`
- `docs/database-design-review.md`
- `docs/convex-foundation.md`
- `docs/feature-flags.md`
- `docs/data-migration-strategy.md`
- `docs/provider-configuration.md`
- `docs/rollout-rollback.md`
- `docs/ci-cd.md`
- `docs/deployment-failure-recovery.md`
- `docs/production-readiness-report.md`
