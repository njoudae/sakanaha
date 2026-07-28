# M12 notifications

M12 adds an additive Convex notification subsystem without changing any approved user interface,
route, dashboard, authentication flow, or existing provider adapter.

## Capabilities

- `notifications.list` provides a realtime, paginated in-app inbox for the authenticated profile.
- `notifications.unreadSummary` returns a bounded unread badge count.
- `notifications.markRead`, `markUnread`, `markAllRead`, and `archive` enforce recipient ownership.
- `notifications.getPreferences` and `updatePreferences` manage in-app, email, SMS, push,
  event-specific, and timezone-aware quiet-hour settings.
- `notificationState.enqueue` is the private, idempotent event entry point for server workflows.
- `notificationDelivery.processDue` processes email and SMS deliveries in bounded batches.
- A one-minute Convex cron drains pending delivery records. Enqueue also schedules an immediate run.

Push remains represented in the pre-existing preference model but is not delivered in M12.

## Default preferences

- In-app: enabled.
- Email: enabled when the profile has an email address.
- SMS: disabled until the user explicitly opts in.
- Push: disabled.

Disabling an event type suppresses all of its channels. Missing destinations are recorded as skipped
delivery records so support can distinguish preference and profile configuration issues.

## Queue and retry guarantees

Each event requires a stable idempotency key. Notifications and channel deliveries retain that key,
preventing duplicate records when an event producer retries. Delivery workers atomically lease due
records for two minutes, process at most 20 records per run, and use the same provider idempotency key
across attempts.

Temporary failures retry up to five attempts with exponential delays from one minute to six hours.
Permanent or exhausted failures enter the failed state and create a redacted audit event. Provider
responses are tracked in `providerUsageEvents`. Email webhook requests include an
`Idempotency-Key` header. SMS providers do not all offer an upstream idempotency facility, so a crash
after provider acceptance and before the Convex completion transaction retains a small duplicate-SMS
risk; the lease and bounded worker concurrency minimize that window.

## Deep-link security

Only existing internal application paths are accepted. Absolute URLs, protocol-relative URLs,
backslashes, control characters, traversal, and unknown paths are rejected. External email/SMS links
are resolved against `SAKNAHA_APP_URL`, which must use HTTPS outside localhost.

## Environment

- `SAKNAHA_APP_URL`: public application origin used for email/SMS deep links.
- `SAKNAHA_EMAIL_PROVIDER=webhook`: current email adapter selection.
- `SAKNAHA_EMAIL_WEBHOOK_URL`: secure transactional email webhook.
- `SAKNAHA_EMAIL_WEBHOOK_SECRET`: required bearer secret; delivery fails closed when absent.
- Existing `SAKNAHA_SMS_*` and provider credential variables remain unchanged.

The email webhook receives `{ to, subject, body, idempotencyKey }` and should return JSON containing
an optional `messageId` or `id`.

## Event producer contract

Backend workflows call the private `notificationState.enqueue` mutation with recipient profile ID,
stable event type, bounded Arabic title/body, priority, optional approved deep link and related entity
IDs, and a deterministic idempotency key. Client code cannot select another recipient.

Business workflows that still use the approved local compatibility services are intentionally not
rewired during M12. They can adopt the private event entry point when their Convex migration milestone
is approved, without changing the notification APIs or UI.

## Rollback

Remove the notification cron and M12 notification functions, then revert the optional idempotency
fields and indexes. Existing notification rows can remain dormant because all schema additions are
backward-compatible and optional. No destructive data migration is required.
