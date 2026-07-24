# Convex Restore Runbook

## Safety Gate

A restore is destructive. It can delete tables and documents in the target deployment. Do not run the execution command during ordinary verification. The default repository command creates a plan only.

Before production recovery, require all of the following:

- declared incident and named incident commander;
- two-person confirmation of the exact target deployment and recovery point;
- writes placed in maintenance/read-only mode using the existing operational controls;
- current audit, monitoring, and provider evidence preserved;
- a newly generated and validated pre-restore backup of the target;
- matching source ZIP and manifest copied to the controlled recovery workspace;
- reviewed source commit and secret-manager environment inventory available;
- Convex status/support checked for platform incidents.

## 1. Validate The Recovery Point

```powershell
npm ci
npm run backup:validate -- --manifest restore-work/<source>.manifest.json
```

Confirm timestamp, production designation, document counts, file counts, artifact origin, retention status, and incident approval. Do not edit a Convex snapshot ZIP.

## 2. Rehearse In An Isolated Deployment

Create or select a clean recovery deployment that is not connected to production traffic. Generate the restore plan:

```powershell
npm run backup:restore -- --manifest restore-work/<source>.manifest.json --deployment <recovery-deployment> --environment staging
```

After peer review, execute with the exact phrase printed by the plan:

```powershell
npm run backup:restore -- --manifest restore-work/<source>.manifest.json --deployment <recovery-deployment> --environment staging --execute --confirm "RESTORE-STAGING:<recovery-deployment>"
```

Deploy the known-good application commit and restore reviewed environment values from the secret manager. Scheduled functions pending at backup time are not recovered; decide explicitly which jobs must be recreated or replayed.

Export and validate the rehearsal target, then compare manifests. Complete role-based application smoke tests without changing approved UI or flows.

## 3. Take The Production Pre-Restore Backup

```powershell
npm run backup:create -- --deployment <production-deployment> --environment production --confirm "BACKUP-PRODUCTION:<production-deployment>" --output-dir restore-work
```

Upload the ZIP and manifest to protected storage before continuing. This artifact is the rollback recovery point for the destructive operation.
The execution guard accepts only a matching production pre-restore backup created within the preceding four hours.

## 4. Execute Production Restore

Generate and peer-review the plan first:

```powershell
npm run backup:restore -- --manifest restore-work/<source>.manifest.json --deployment <production-deployment> --environment production
```

Execute only after the incident commander approves:

```powershell
npm run backup:restore -- --manifest restore-work/<source>.manifest.json --deployment <production-deployment> --environment production --pre-restore-manifest restore-work/<pre-restore>.manifest.json --execute --confirm "RESTORE-PRODUCTION:<production-deployment>"
```

The tool uses Convex `import --replace-all --yes`. Convex files already in the target but absent from the snapshot are not automatically deleted; keep traffic closed until post-restore file reconciliation is accepted.

## 5. Verify Before Reopening Traffic

1. Export the restored production deployment with `backup:create`.
2. Compare the source and restored manifests using `backup:verify-restore`.
3. Confirm the known-good application commit is deployed.
4. Restore environment configuration from the approved secret manager and verify variable names without printing values.
5. Reconcile scheduled jobs, webhooks, notification queues, media cleanup, and third-party provider side effects.
6. Run authentication, admin, owner, user, property, Maps, media, notification, and audit-log smoke tests.
7. Check Sentry, PostHog, Convex logs/insights, delivery queues, and error rates.
8. Reopen writes and traffic gradually after incident-commander approval.

## 6. Abort And Roll Back

If import fails, keep traffic closed, preserve terminal output and the restore receipt if one exists, and contact Convex support before retrying. Do not repeatedly import into production without diagnosis.

If verification fails, restore the pre-restore backup using the same gated workflow or keep the service unavailable while the incident commander selects another known-good point. Application rollback alone does not reverse restored data.

## Validation Record

Record: incident/drill ID, source and pre-restore manifest hashes, target deployment, operators, approvals, start/end timestamps, measured RPO/RTO, validation output, smoke-test result, monitoring result, exceptions, and follow-up owner/date. Store the record in the approved operational system, not in the backup artifact directory.
