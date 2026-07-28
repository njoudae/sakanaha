# Phase 2 — Backend, Schema, and Domain Alignment

## Scope

Phase 2 establishes Convex as the production system of record without redesigning
the UI. Legacy browser authentication and business-data services remain available
only as a development transition path controlled by feature flags.

## Architecture changes

- `userProfiles` is the centralized platform profile. Its provider-neutral
  `identityKey` will be populated only by the final Authentication integration.
- `ownerProfiles` remains an optional real-estate-agent extension.
- Global and scoped permissions remain in `roleAssignments`.
- The target roles are `admin`, `moderator`, `support`,
  `real_estate_agent`, and `user`. `owner` and `service_provider` remain accepted
  temporarily only for a widen-migrate-narrow rollout.
- Production and staging templates enable Convex data and disable legacy local
  authentication.
- No phone number is embedded in backend authorization or publishing logic.

## Tables

Added:

- `payments`: idempotent payment intents and verified provider results.
- `bootstrapRuns`: one-time secure initialization markers.

Extended:

- `userProfiles`: provider-neutral canonical identity key.
- `properties`: workflow/payment status and content review versions.
- `roommateRequests`: nullable linked property, external housing, workflow, and payment.
- `auditEvents`: explicit admin, entity, reason, previous value, and new value fields.

Removed:

- None. Phase 2 uses additive schema changes to preserve existing data.

## Workflows

Property:

`draft → pending_payment → paid → pending_admin_review → approved → published`

Additional states: `changes_requested`, `rejected`, `archived`, `suspended`.
Verified payment never publishes a property. Only an authenticated active admin
can publish it.

Roommate card:

`draft → pending_payment → paid → published`

It may reference `linkedPropertyId` or contain `externalHousing`; an external
card no longer requires a fabricated property. Verified payment publishes the
card automatically. Admin operations support hide, suspend, soft delete, and
restore.

## Required field classification

### A — registration

- Verified identity from the final authentication provider
- Canonical provider-neutral identity key
- Display name (derived from verified identity when absent)
- `userProfiles.status`
- Base role `user`

### B — save draft

Property:

- Authenticated real-estate-agent profile
- Owner profile
- Draft title or generated working title

Roommate card:

- Authenticated user
- Source (`saknaha_property` or `external_property`)

All other creation fields remain optional during draft editing.

### C — before payment

Property:

- Title and description/search content
- City and district
- Housing/property type
- At least one price and display period
- Available-unit inventory
- Property/license identifier
- Valid location
- At least one uploaded image

Roommate card:

- City and district
- Personal summary
- Occupation/user type
- Available rooms and price
- Lifestyle preferences
- Linked property or complete external-housing summary

### D — before publication

Property:

- Verified successful payment
- Submitted content version
- Admin approval
- No unresolved change request
- Non-suspended owner and property
- Reviewed critical fields matching the submitted version

Roommate card:

- Verified successful payment
- Active owner profile
- Complete linked/external housing data
- Not hidden, suspended, or soft deleted

### E — optional

- Exact public coordinates (may be approximate/private)
- Secondary landmarks
- Video
- Deposit and price notes
- Nearby facilities
- University/major
- Non-critical lifestyle narrative

## Admin bootstrap

`convex/bootstrap.ts` exposes only an `internalMutation`. It accepts an opaque,
canonical `identityKey` created by the final authentication integration, finds
one existing platform profile, grants one global admin assignment, writes an
audit event, and records `initial-platform-admin-v1` in `bootstrapRuns`.
Re-running it is idempotent and cannot promote a second account.

The bootstrap does not know the provider, phone, email, or local account model.
It does not create or link users. There is no public admin-promotion mutation.
The function remains inactive until the Authentication phase supplies and
verifies the provider-neutral identity key.

## Migration strategy

1. Deploy additive optional fields and new indexes.
2. Enable new writes and dual-read old/new workflow fields.
3. Export legacy browser business data and dry-run the existing internal import.
4. Backfill target roles, workflow states, and payment states
   in bounded batches.
5. Verify zero legacy-only records.
6. Disable local auth/data flags in staging, then production.
7. Narrow validators and remove deprecated roles/fields in a later approved
   deployment.

## Breaking changes

- Property submission now requires verified payment and always enters admin review.
- The development-phone auto-publication exception was removed.
- Roommate publication is tied to verified payment rather than phone or admin review.
- Production templates now select Convex data.

## Remaining risks

- Existing localStorage business records still require an operator-run import;
  the transition service remains development-only until that import is verified.
- Initial administrator assignment is intentionally postponed until the final
  authentication provider is implemented and supplies a canonical identity key.
- Convex CLI's own deploy typecheck reports pre-existing circular inference
  errors in maps, SMS, and notification delivery. Project-wide `tsc -b` passes;
  deployment currently uses `--typecheck=disable` pending a separate approved fix.
- Payment provider webhook verification is represented by an internal mutation;
  provider signature validation belongs to the later payment integration phase.
