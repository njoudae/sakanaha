# Backup And Disaster Recovery

## Scope

This M14 plan protects Convex table data and Convex Storage without changing application code, APIs, schemas, providers, routes, or UI. Source control and the deployment platform remain the source of truth for application code and frontend configuration. Deployment secrets remain in the approved secret manager and must never be copied into backup artifacts.

Convex snapshots do **not** contain deployed functions, environment variables, deployment configuration, or pending scheduled functions. Recovery therefore combines a data restore with a reviewed source release and independently managed environment configuration.

## Recovery Objectives

| Service class                          |              RPO target |     RTO target | Backup cadence                              |
| -------------------------------------- | ----------------------: | -------------: | ------------------------------------------- |
| Production Convex data and files       |                24 hours |        4 hours | Daily Convex backup with file storage       |
| Pre-release / pre-migration checkpoint | 0 hours at change start |        2 hours | Manual backup immediately before the change |
| Staging                                |                  7 days | 1 business day | Weekly or before destructive tests          |

The incident commander may tighten these objectives after measuring real production backup and restore duration. A missed production backup or failed validation is a release-blocking incident.

## Backup Strategy

1. Enable Convex periodic production backups and include file storage. Convex plan retention is not the long-term retention layer.
2. Run the repository export workflow at least daily from a locked-down operator or scheduled runner:

   ```powershell
   npm run backup:create -- --deployment prod --environment production --confirm "BACKUP-PRODUCTION:prod" --output-dir backups
   ```

3. Copy each ZIP and matching manifest together to encrypted, access-controlled object storage in a separate failure domain. Use immutable/versioned retention where available.
4. Retain daily artifacts for 35 days, weekly artifacts for 13 weeks, and monthly artifacts for 12 months, subject to the organization retention policy.
5. Restrict backup read access to the recovery role; restrict restore execution to two approved operators. Log downloads, validation, deletion, and restores in the incident/audit system.
6. Keep environment-variable names and recovery ownership in the secret-manager inventory. Never export secret values into this repository or the backup manifest.

The generated manifest records the target, environment, timestamp, archive byte size, SHA-256, table document counts/content hashes, and stored-file content inventory. It intentionally excludes credentials.

## Validation

Every generated backup is streamed and validated before its manifest is written. Validation checks ZIP integrity while reading entries, rejects unsafe or duplicate paths, parses every JSONL document, requires Convex table layout, reconciles `_storage` metadata with file entries, and records content hashes.

Validate an artifact after transfer and before restore:

```powershell
npm run backup:validate -- --manifest backups/<snapshot>.manifest.json
```

Quarterly, restore the latest production backup into a clean, isolated recovery deployment, export that deployment, and compare the source and restored manifests:

```powershell
npm run backup:verify-restore -- --source-manifest backups/<source>.manifest.json --restored-manifest backups/<restored>.manifest.json
```

Record the date, source recovery point, operators, elapsed backup/restore time, validation output, exceptions, and remediation ticket. A checksum-only check is not a restore drill.

## Disaster Scenarios

- **Bad application release:** stop writes if data integrity is at risk, roll back application code, then assess whether data recovery is required.
- **Accidental or malicious data change:** revoke compromised access, preserve logs, take a pre-restore backup, select the last known-good recovery point, and follow the restore runbook.
- **Lost environment configuration:** restore reviewed values from the secret manager; snapshot imports cannot recover them.
- **Convex region/service incident:** follow Convex status/support guidance, preserve the latest external artifact, and do not create competing restores without an incident commander.
- **Credential compromise:** rotate credentials before restoring service. Backups do not make compromised credentials safe.
- **File-storage inconsistency:** keep writes closed until `_storage` metadata and stored-file inventory pass post-restore comparison.

## Ownership And Review

- The platform owner owns scheduling, retention, and access reviews.
- The on-call incident commander authorizes production recovery.
- Two operators verify the deployment name, recovery point, pre-restore backup, and confirmation phrase.
- Review this plan quarterly and after every recovery event, material schema change, storage-provider change, or measured RPO/RTO miss.

Official platform behavior is documented in the [Convex backup and restore guide](https://docs.convex.dev/database/backup-restore) and [Convex data import guide](https://docs.convex.dev/database/import-export/import).
