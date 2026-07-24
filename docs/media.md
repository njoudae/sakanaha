# Media pipeline (M11)

## Scope and compatibility

Property image uploads use the existing `StorageProvider` contract. `convex` remains the default
provider; `awsS3` and `cloudflareR2` remain valid provider names so adapters can be registered later
without changing application-facing media code. Existing routes, forms, dashboards, navigation,
legacy URLs, and local-storage fallback behavior are unchanged.

The `propertyMedia` schema changes are additive. Existing rows remain valid, including rows that use
`legacyUrl`. A property can contain up to 30 active images, one of which can be marked as its cover.

## Upload lifecycle

1. The browser validates JPEG, PNG, or WebP input and the 10 MiB default limit.
2. Images larger than 2,000 px are resized and WebP compression is used when it reduces size. A
   480 px WebP thumbnail is generated automatically.
3. An authenticated client reserves two short-lived Convex upload URLs. If a property is supplied,
   the server verifies owner, moderator, or administrator access before issuing them.
4. The original is uploaded and registered before the thumbnail is sent. This makes partially
   completed uploads visible to the cleanup job.
5. Convex validates storage metadata (declared type and exact size), then an action reads the blobs
   and validates their magic bytes. Successful files become `approved`; invalid files are rejected
   and deleted.
6. The client reports preparation/upload/processing progress and retries failed attempts up to three
   times using fresh upload URLs.

Upload reservations expire after 30 minutes. The hourly `mediaCleanup.cleanupOrphans` cron deletes
expired pending objects and rejected objects older than seven days in bounded batches. Explicit
deletion removes both the original and thumbnail immediately while retaining a soft-deleted metadata
record for auditability.

## Access control

- All upload, retry, attach, cover, and delete operations require an active authenticated profile.
- Property mutations require ownership or an administrator/moderator role.
- Draft-property media is private to authorized managers. Approved media for published properties is
  returned through `media.listForProperty`.
- File names are metadata only and are never used as storage paths.
- SVG, executable content, empty files, MIME mismatches, oversized files, invalid image signatures,
  and oversized thumbnails are rejected.

Convex Storage URLs are capability URLs. They must not be written to logs or exposed outside an
authorized application response. If fully revocable per-request streaming becomes a requirement, a
future provider adapter can serve objects through an authenticated proxy without changing callers.

## Configuration

| Variable                           | Default    | Purpose                          |
| ---------------------------------- | ---------- | -------------------------------- |
| `SAKNAHA_STORAGE_PROVIDER`         | `convex`   | Active storage adapter           |
| `SAKNAHA_STORAGE_MAX_UPLOAD_BYTES` | `10485760` | Server-side original image limit |

## Rollback

1. Set `SAKNAHA_STORAGE_PROVIDER=disabled` to stop issuing new upload URLs.
2. Revert the media client/provider wiring to restore the previous browser-only data URL path.
3. Keep the additive `propertyMedia` fields during rollback; removing them is unnecessary and could
   discard operational history.
4. Existing Convex objects can be retained while investigating or removed through the bounded cleanup
   mutation after confirming no approved record references them.
