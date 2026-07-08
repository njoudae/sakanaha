# Rollout And Rollback Protocol

## One-Milestone Rule

Implementation proceeds exactly one milestone at a time. No work from the next milestone should start until the current milestone is summarized, validated, and approved.

## Required Closeout For Every Milestone

Each milestone closeout must include:

- changes made,
- files affected,
- lint result,
- typecheck result,
- test result,
- build result,
- warnings,
- risks,
- rollback notes,
- explicit request for approval before the next milestone.

## Validation Commands

Until M2 adds production hygiene scripts, missing commands must be reported clearly.

Current known root commands:

- `npm run build`
- `npm run build:all`
- `npm run dev`
- `npm run preview`

Expected future commands after M2:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Rollout Stages

1. Local development with feature flag disabled by default.
2. Local development with flag enabled and seeded test data.
3. Staging with internal users.
4. Staging with migration dry run where relevant.
5. Production dark launch.
6. Tenant or cohort rollout.
7. Full rollout after monitoring confirms stability.

## Rollback Strategy

General rollback order:

1. Disable the feature flag or kill switch.
2. Stop new writes or external provider calls.
3. Preserve existing data for investigation.
4. Restore prior UI path or read path.
5. Run validation commands.
6. Document incident notes and follow-up fixes.

Data rollback:

- Never delete source localStorage data during migration.
- Export before import.
- Dry-run before write.
- Keep migration checkpoints.
- Support re-running idempotent imports.

Provider rollback:

- Switch provider config to `disabled` or the previous provider.
- Preserve normalized usage events.
- Avoid changing domain logic when switching providers.

Auth rollback:

- Keep at least one stable auth method available before enabling additional methods.
- Disable risky providers independently.
- Preserve profile records and audit events.

Media rollback:

- Stop new uploads first.
- Keep approved media readable.
- Quarantine unprocessed or failed uploads.
- Do not publish unscanned media.

## Approval Gate

After closeout, implementation pauses. The next milestone starts only after explicit user approval.
