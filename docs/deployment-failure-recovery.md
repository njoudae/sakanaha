# Deployment failure recovery

## Stop conditions

Do not create or move a production release tag when any quality, environment, deployment, or health
gate fails. Pause notification/SMS or paid maps calls with their existing kill switches if an
incident could create external cost or user impact.

## Failure matrix

| Failure                                   | State                                        | Recovery                                                                                                                      |
| ----------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Quality gate                              | Nothing deployed                             | Correct the revision; open a new PR; do not bypass the required check.                                                        |
| Environment validation                    | Nothing deployed                             | Add or rotate the missing environment-scoped value, then rerun. Never place the value in workflow YAML or repository files.   |
| Vercel build inside Convex deploy command | Neither platform deployed                    | Inspect build logs, fix the revision/configuration, and rerun.                                                                |
| Convex deployment                         | Web artifact built but not published         | Restore/fix Convex configuration and rerun. The workflow must not call `vercel deploy` after this failure.                    |
| Vercel upload                             | Convex may be new; web alias remains old     | Redeploy the previous Convex release immediately or complete the matching Vercel deployment after diagnosis.                  |
| Immutable URL health                      | Both may be deployed; tag absent             | Keep the production alias under observation, inspect the immutable deployment, and coordinate rollback if it is user-visible. |
| Canonical alias health                    | Deployment exists but DNS/alias is unhealthy | Check Vercel alias/DNS/TLS. Roll the alias back if resolution cannot be restored quickly.                                     |
| Tag push                                  | Healthy deployment exists without tag        | Verify the deployed SHA, then create the annotated tag manually and rerun only GitHub release creation.                       |
| GitHub release creation                   | Healthy deployment and tag exist             | Run `gh release create <tag> --verify-tag --generate-notes`; do not redeploy.                                                 |

## Coordinated rollback

Frontend and backend must be treated as one release:

1. Identify the last healthy production tag, Vercel deployment URL, and Convex deployment audit
   entry.
2. Enable relevant kill switches if the incident involves external providers or write paths.
3. Point the Vercel production alias to the last healthy deployment with
   `vercel rollback <deployment-url-or-id>`.
4. Check out the last healthy tag in a clean operator workspace.
5. Set only the production `CONVEX_DEPLOY_KEY` and redeploy that tag with `npx convex deploy`.
6. Run `node scripts/ci/verify-health.mjs --url <production-url>` and the critical manual smoke
   tests.
7. Verify Sentry, audit events, provider health, notification queues, and media cleanup.
8. Preserve logs and deployment identifiers; open an incident record and document the cause.

Convex code rollback is a forward redeploy of the last healthy source revision. Do not restore data
unless the incident changed or corrupted data. If data restoration is required, follow
`docs/backup-restore-runbook.md`, obtain the required approvals, and validate the backup before any
write.

## Secret compromise

1. Disable or revoke the affected credential at its provider.
2. Replace it independently in staging, production, and GitHub environment secrets as applicable.
3. Rotate related webhook credentials and invalidate sessions if authentication material was
   affected.
4. Rerun environment validation and a staging deployment.
5. Promote a production release only after provider and authentication smoke tests pass.

## Recovery evidence

Record the release SHA/tag, workflow run, Vercel deployment IDs, Convex audit messages, time to
detect, time to recover, user impact, data impact, and follow-up owner. Link backup validation or
restore-drill evidence when data recovery was involved.
