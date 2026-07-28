# M13 monitoring and analytics

M13 adds disabled-by-default error monitoring, performance monitoring, audit inspection, and usage
analytics without modifying any approved page, component, dashboard, navigation, authentication flow,
provider contract, or RTL styling.

## Browser monitoring

Sentry initializes before React when `VITE_FEATURE_MONITORING_SENTRY_ENABLED=true` and a valid
`VITE_SENTRY_DSN` is present. It captures uncaught errors, unhandled rejections, and sampled browser
performance traces through the official React SDK and browser tracing integration.

Privacy controls:

- `sendDefaultPii` is disabled.
- Session replay is disabled.
- User objects and arbitrary extra context are removed before transmission.
- Request query strings and entity identifiers are replaced with route templates.
- Breadcrumbs are bounded and common email, phone, token, code, and secret values are redacted.
- Trace propagation is restricted to same-origin relative requests.

`VITE_SENTRY_TRACES_SAMPLE_RATE` is clamped from 0 to 1 and defaults to 0.1. Sentry failures do not
block application rendering.

## Source maps

The official Sentry Vite plugin enables hidden source maps only when all of `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG`, `SENTRY_PROJECT`, and `VITE_APP_RELEASE` are configured. Source maps are uploaded during
the production build and deleted from `dist` afterward. The auth token is a build secret and must
never use the `VITE_` prefix.

## Usage analytics

PostHog loads asynchronously only when `VITE_FEATURE_ANALYTICS_POSTHOG_ENABLED=true`, a project key is
present, and the host is HTTPS. Only explicit events are emitted; DOM autocapture, automatic
pageviews, page-leave capture, session replay, and person profiles are disabled. Persistence is
memory-only and the integration does not identify users or send email, phone, display name, property
ID, roommate request ID, search text, or full URLs.

SPA page changes emit a templated `page_view`. The approved event contract accepts only stable names
and bounded scalar properties.

If Content Security Policy is enabled, `connect-src` must permit the configured PostHog ingestion host
and Sentry DSN host. No remote PostHog extension is required by this configuration because replay,
surveys, error autocapture, and feature flags are not used.

## Performance monitoring

The `web-vitals` package records CLS, FCP, INP, LCP, and TTFB. Metrics are sampled through
`VITE_WEB_VITALS_SAMPLE_RATE`, attached to Sentry as bounded breadcrumbs, and sent to PostHog through
the explicit `web_vital` event when PostHog is enabled. Collection never delays rendering.

## Convex analytics and audit logs

`usageAnalyticsEvents` is an additive, high-churn table separate from profiles and operational data.
Authenticated ingestion derives the user from Convex Auth, accepts only allowlisted event names and
properties, templates entity routes, and permits at most 60 events per profile per minute.

The private `observability.recordAudit` mutation provides a normalized future audit entry point.
Existing M5-M12 audit inserts remain unchanged. Paginated usage and audit queries require an active
global admin, support, or moderator role. Audit query results suppress IP and user-agent hashes and
remove common sensitive metadata keys.

## Environment variables

Browser-safe values:

- `VITE_FEATURE_MONITORING_SENTRY_ENABLED`
- `VITE_FEATURE_ANALYTICS_POSTHOG_ENABLED`
- `VITE_FEATURE_PERFORMANCE_WEB_VITALS_ENABLED`
- `VITE_APP_ENV`
- `VITE_APP_RELEASE`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_TRACES_SAMPLE_RATE`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`
- `VITE_WEB_VITALS_SAMPLE_RATE`

Build secrets:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

The existing `SAKNAHA_MONITORING_PROVIDER` and `SAKNAHA_ANALYTICS_PROVIDER` selectors remain unchanged
for server-side provider selection.

## Operational validation

1. Deploy staging with separate Sentry and PostHog projects.
2. Confirm a controlled staging exception appears without PII.
3. Confirm source-mapped stack frames match the release.
4. Confirm one templated page view and Web Vitals events arrive.
5. Confirm no session recordings, user profiles, form values, query strings, or entity IDs are sent.
6. Confirm disabling either feature switch stops its outbound traffic.

## Rollback

Disable the three browser feature switches for immediate rollback. A code rollback removes the
observability import, M13 modules, Vite plugin, dependencies, environment variables, additive table,
and protected queries. Existing analytics rows can remain dormant; no destructive migration is
required.
