# Saknaha Production Architecture

## Purpose

This document defines the production target architecture for Saknaha. It is the baseline for milestone implementation and should be updated whenever a production decision changes.

## Current State

- `apps/web` is the only implemented application.
- `apps/backend`, `apps/admin`, `apps/mobile`, and `packages/ui` are placeholders.
- The web app currently stores owners, users, properties, favorites, interests, roommate requests, and negotiations in browser `localStorage`.
- Authentication is currently client-side phone lookup, not a production trust boundary.
- Maps and media are partially mocked or browser-local.
- There are no first-party lint, typecheck, test, CI, backend, monitoring, analytics, backup, or disaster recovery systems yet.

## Target Architecture

Saknaha will use a Convex-first backend architecture:

- React/Vite remains the primary web frontend in `apps/web`.
- Convex owns server functions, typed schema, indexes, storage, realtime subscriptions, access control, and background work.
- Convex Auth is the default authentication layer.
- Convex Storage is the default media storage layer.
- Third-party integrations are accessed only through server-side provider adapters and typed configuration.
- Frontend code consumes typed service adapters and must not store secrets or enforce authorization as the only protection.

## Application Boundaries

- `apps/web`: customer and owner web experience.
- `apps/admin`: future operations and platform administration UI.
- `apps/mobile`: future mobile application.
- `convex/`: production backend, schema, functions, actions, storage, auth, and generated types.
- `packages/shared-types`: portable domain types that are safe to use across frontend and backend.
- `packages/constants`: shared static constants and temporary mock seed data.
- `packages/utils`: framework-independent utilities.
- `packages/ui`: future shared UI primitives once multiple apps need common components.

## Data Ownership

Convex becomes the source of truth for all production data:

- user and owner profiles,
- service provider profiles and service offerings,
- properties and property status,
- media metadata,
- favorites and interests,
- roommate requests and preferences,
- notifications and delivery attempts,
- provider usage and estimated costs,
- audit events,
- migration state.

Browser storage may only be used for non-authoritative UI state or staged migration exports. It must not determine identity, permissions, ownership, or paid-provider behavior.

## Auth And Authorization

Default authentication:

1. Google Login through Convex Auth.
2. Email OTP through Convex Auth.
3. Phone OTP as an optional feature flag.
4. Apple Sign In supported by architecture but disabled by default until an iOS app or explicit business requirement exists.

Authorization rules:

- Every private Convex query or mutation must derive the current user from the authenticated session.
- Owner, service provider, moderator, support, and admin functions must verify platform role and direct resource ownership or explicit scoped permission before accessing private data.
- Public listing queries may return only published, safe fields.
- Owner IDs, user IDs, and property IDs from clients are treated as untrusted input.

## Provider Strategy

All third-party providers must be replaceable through configuration. Provider-specific SDKs and request shapes stay behind server-side adapters.

Required adapter families:

- maps: Google Maps, Mapbox, OpenStreetMap/OSRM,
- SMS: Msegat, Taqny, Twilio,
- storage: Convex Storage default, future AWS S3 and Cloudflare R2,
- notifications: email, SMS, push, in-app,
- monitoring: Sentry,
- analytics: PostHog,
- cost usage: provider usage collectors and estimators.

## Realtime And Background Work

Convex realtime subscriptions should power:

- owner dashboard updates,
- listing status changes,
- media processing status,
- notification inbox updates,
- favorites and interest state.

Background jobs should be queue-backed and idempotent:

- OTP delivery,
- notifications,
- media processing,
- provider usage aggregation,
- audit export,
- cleanup of expired OTPs, stale uploads, and orphaned records.

## Observability

Production observability will include:

- Sentry for frontend and backend error reporting, performance traces, and release health.
- PostHog for privacy-safe product analytics, funnels, and feature adoption.
- Structured audit events for sensitive business actions.
- Provider usage aggregation for admin cost reporting.

PII must not be sent to analytics or logs unless explicitly required and approved.

## Backup And Disaster Recovery

Backup and DR planning is a dedicated milestone. Production readiness requires:

- documented backup cadence,
- restore runbook,
- staging restore drill,
- media recovery checks,
- RPO and RTO targets,
- incident ownership and communication path.

## Non-Negotiable Production Constraints

- No secrets in frontend code.
- No client-only authorization.
- No provider-specific logic leaking into UI components.
- No major module ships without a feature flag and rollback path.
- No data migration proceeds without dry-run validation and rollback documentation.
- No milestone begins until the previous milestone is approved.
