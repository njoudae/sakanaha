# Final production readiness report — M1–M17

## Executive conclusion

The approved Saknaha application is code-complete through M17 and has production-grade local quality
gates, protected CI/CD definitions, environment validation, security hardening, backup/restore
procedures, performance budgets, deployment health verification, and coordinated rollback
documentation. No product feature or UI change is included in M17.

Production launch still requires operator-owned external configuration: separate cloud projects,
GitHub environment protections and secrets, DNS/OAuth/provider setup, a successful live staging run,
manual smoke testing, and a protected production workflow run. Those external actions cannot be
completed from the repository alone.

## Milestone readiness summary

| Milestone | Approved outcome                                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1        | Existing product and approved user experience established as the compatibility baseline.                                                                                                 |
| M2        | Monorepo engineering hygiene, workspace commands, linting, typing, testing, and build foundations.                                                                                       |
| M3        | Data inventory and backward-compatible localStorage-to-Convex migration strategy.                                                                                                        |
| M4        | Convex schema, validators, indexes, migration boundaries, seed validation, and generated types.                                                                                          |
| M5        | Authentication service boundary and protected production-auth architecture.                                                                                                              |
| M6        | Google authentication integration behind the existing feature flags and user flow.                                                                                                       |
| M7        | Secure Email OTP authentication and delivery boundary.                                                                                                                                   |
| M8        | SMS provider abstraction, OTP delivery, quotas, retries, failover, health, and kill switch.                                                                                              |
| M9        | Maps provider abstraction, server actions, caching, quotas, health, and fallback behavior.                                                                                               |
| M10       | Approved platform workflows, dashboards, routes, location architecture, and production UX baseline.                                                                                      |
| M11       | Convex Storage media pipeline with secure uploads, validation, thumbnails, covers, retries, metadata, permissions, and cleanup.                                                          |
| M12       | In-app/email/SMS notifications, preferences, queueing, retries, deep links, and read state.                                                                                              |
| M13       | Sentry/PostHog-ready monitoring, Web Vitals, privacy-safe analytics, audit logging, and usage inspection.                                                                                |
| M14       | Backup strategy, validated ZIP/manifest tooling, restore verification, DR runbooks, RPO/RTO, and drills.                                                                                 |
| M15       | Route splitting, lazy loading, vendor chunking, image/bundle budgets, caching, and production performance optimization.                                                                  |
| M16       | Server-side authorization review, audit integrity, endpoint/SSRF controls, CSP/security headers, adversarial tests, and clean dependency audit.                                          |
| M17       | GitHub Actions quality gates, isolated staging/production deployment workflows, environment/secret validation, health checks, release tagging, artifacts, and rollback/failure recovery. |

## Automated readiness evidence

- Root gates: lint, typecheck, all tests, security tests, dependency audit, build, performance budget,
  secret scan, environment validation, workflow/deployment validation, and `git diff --check`.
- Deployment artifact: hashed Vite assets in `apps/web/dist`; no public source maps unless uploaded
  and removed by the configured Sentry build integration.
- Release traceability: exact SHA, environment-specific Convex audit message, immutable Vercel URL,
  retained `.vercel/output`, semver tag, and GitHub release.
- Post-deploy checks: SPA shell, route fallback, security headers, hashed asset caching, canonical alias,
  and Convex function metadata.

## Required production deployment steps

1. Merge the reviewed M17 repository changes through a pull request whose Quality Gates job passes.
2. Create dedicated Vercel staging and production projects; disable their automatic Git deployments.
3. Create dedicated Convex staging and production projects/deployments and least-privilege deploy
   keys.
4. Create GitHub `staging` and `production` environments. Add their separate
   `CONVEX_DEPLOY_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets and
   `APP_HEALTH_URL` variable.
5. Protect `main` and require the `Lint, test, secure, and build` job. Configure production required
   reviewers, prevent self-approval, and restrict deployment to `main`.
6. Populate the staging Vercel and Convex environments from `.env.staging.example`. Use only staging
   OAuth clients, webhook secrets, provider credentials, quotas, monitoring projects, and callbacks.
7. Merge to `main`. Confirm the automatic Deploy Staging workflow deploys the exact successful SHA
   and passes both health checks.
8. Manually verify staging: Google login, Email OTP, optional Phone OTP, user/owner/admin dashboards,
   property flows, university directions/privacy, media upload/cover/removal, notifications,
   monitoring events, analytics privacy, provider kill switches, and backup validation.
9. Populate production environments from `.env.production.example`; configure DNS/TLS, exact OAuth
   callbacks, quotas, billing alerts, Sentry/PostHog release environments, backup schedules, and
   incident contacts.
10. Set `package.json` to the intended release version in a reviewed PR. For the initial current
    version, the tag is `v0.1.0`.
11. Dispatch Release Production with the matching semver tag and the full staging-verified SHA.
    Obtain the independent production-environment approval.
12. Confirm the workflow reruns all gates, deploys both platforms, verifies immutable and canonical
    health, retains the artifact, and creates the tag/release only after success.
13. Monitor Sentry, Web Vitals, audit events, notification/media jobs, provider health/cost, and Vercel
    logs through the agreed observation window. Record release evidence.

## Remaining recommendations and operational risks

- Direct public Convex map actions retain the documented quota-exhaustion residual risk; add an edge
  WAF/gateway if abuse appears.
- CSP keeps broad HTTPS connection/image allowances for environment-selectable providers; narrow
  them after production origins are stable.
- DNS rebinding defense should be supplemented with provider/network egress controls.
- Privileged role assignments have status revocation but no expiration timestamp; enforce periodic
  access reviews.
- Provider delivery and authentication depend on correctly rotated external secrets and exact
  callbacks.
- Production rollback of Convex is a redeployment of the prior source revision, not an instant alias
  switch; keep the last healthy tag and operator access ready.
- A live CI/CD run cannot be proven until the workflows are committed and environment secrets exist.
  Local workflow parsing and all executable repository gates must pass before that first run.

## Go-live decision

Repository readiness: **ready** after all final M17 gates pass.

Operational readiness: **conditional** on completing steps 1–13 above, recording a successful
staging deployment and smoke test, validating a current backup/recovery point, and obtaining the
production approval.
