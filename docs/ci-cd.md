# M17 CI/CD architecture

## Deployment topology

Saknaha uses two permanent, isolated deployment stacks:

| Boundary           | Staging                                 | Production                                               |
| ------------------ | --------------------------------------- | -------------------------------------------------------- |
| GitHub environment | `staging`                               | `production` with required reviewer and no self-approval |
| Vercel             | Dedicated staging project               | Dedicated production project                             |
| Convex             | Dedicated staging project/deployment    | Dedicated production project/deployment                  |
| Domain             | Staging-only HTTPS domain               | Production HTTPS domain                                  |
| Providers          | Test credentials, quotas, and callbacks | Production credentials, quotas, and callbacks            |
| Monitoring         | Staging release/environment             | Production release/environment                           |

Never point the staging Vercel project at the production Convex deployment or reuse production
provider credentials in staging. Disable Vercel Git auto-deployments for both projects so GitHub
Actions is the only deployment authority.

## Workflows

### Quality Gates

Runs for pull requests, pushes to `main`, and manual validation. It performs:

1. locked `npm ci` installation on Node.js 22;
2. environment-template, deployment-configuration, workflow-syntax, and secret validation;
3. lint and TypeScript checks;
4. all unit, integration, backup, and security tests;
5. dependency audit at low severity or higher;
6. production build and performance budget;
7. artifact and whitespace validation; and
8. retention of the immutable `apps/web/dist` artifact for 14 days.

Configure branch protection so `Lint, test, secure, and build` is required before merging `main`.

### Deploy Staging

A successful push-triggered Quality Gates run on `main` starts staging deployment. The job checks out
the exact validated SHA, enters the protected `staging` GitHub environment, validates secrets and
both platform environments, builds with the staging Convex URL, deploys Convex, uploads the prebuilt
Vercel artifact, verifies Convex function metadata, checks the immutable deployment and staging
alias, then retains `.vercel/output` for 14 days.

### Release Production

Production is manually dispatched with:

- `version`: a semver tag exactly matching `package.json`, such as `v0.1.0`;
- `commit_sha`: the full 40-character SHA already tested on staging.

The job requires the SHA to be on `main`, reruns every quality gate, enters the protected
`production` environment, validates production secrets, deploys the isolated production Convex and
Vercel projects, verifies health, retains `.vercel/output` for 30 days, and only then creates the
annotated tag and GitHub release. A failed health check leaves the revision untagged.

## Required GitHub environment configuration

Create `staging` and `production` environments. Each needs these environment secrets:

| Secret              | Scope                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| `CONVEX_DEPLOY_KEY` | Least-privilege deploy key for only that environment's Convex deployment. |
| `VERCEL_TOKEN`      | Vercel CLI token owned by a deployment service account.                   |
| `VERCEL_ORG_ID`     | Team/account containing only the intended project access.                 |
| `VERCEL_PROJECT_ID` | Different project ID in staging and production.                           |

Each environment also needs the non-secret variable `APP_HEALTH_URL`, set to its canonical HTTPS
application origin.

Production environment protections:

- require at least one reviewer other than the initiator;
- prevent self-approval;
- allow deployment only from `main`;
- keep deployment concurrency at one;
- restrict secret-management access to production operators.

## Platform environment variables

- Vercel contains public `VITE_*` configuration and Sentry source-map build credentials.
- Convex contains JWT/JWKS material, OAuth credentials, OTP webhook secrets, maps/SMS provider
  secrets, notification secrets, and provider controls.
- Vercel and Convex values are validated without printing values. Convex validation uses
  `npx convex env list --names-only`.
- `.env.staging.example` and `.env.production.example` are key manifests only and must never contain
  live values.

## Artifacts and traceability

- Quality artifact: `web-dist-<commit-sha>`, retained 14 days.
- Staging artifact: `staging-vercel-output-<commit-sha>`, retained 14 days.
- Production artifact: `production-vercel-output-<version>`, retained 30 days.
- Convex deployment audit message includes environment, release, and commit SHA.
- Production Git tag and GitHub release are created only after post-deploy verification.

## Initial repository setup

1. Create and configure the two GitHub environments.
2. Configure branch protection for `main` and require the Quality Gates job.
3. Create separate staging and production Vercel projects; disable Git auto-deployments.
4. Create separate staging and production Convex projects/deployments and least-privilege deploy
   keys.
5. Populate Vercel and Convex environment variables from their matching example manifests.
6. Add environment secrets and `APP_HEALTH_URL` in GitHub.
7. Run Quality Gates manually once, then merge a reviewed change to exercise staging.
8. Complete staging smoke tests before dispatching the first production release.
