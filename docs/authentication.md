# Authentication Foundation

## Scope

M5 introduces production authentication boundaries without switching existing user journeys away from the localStorage compatibility flow. Convex Auth is the default production provider, but the UI talks only to `AuthService`.

## Enabled Providers

- Google Login: implemented through Convex Auth, gated by `auth.google.enabled`.
- Email OTP: implemented through Convex Auth, gated by `auth.emailOtp.enabled`.
- Phone OTP: implemented through Convex Auth and internal `SmsProvider` delivery, gated by `auth.phoneOtp.enabled`, `AUTH_PHONE_OTP_ENABLED=true`, and `SAKNAHA_SMS_ENABLED=true`.
- Apple Sign In: intentionally disabled. The architecture can add it later as another provider behind `AuthService`.

## Security Controls

- UI components never import Convex Auth APIs directly.
- OTP values are generated server-side and stored by Convex Auth as hashes in `authVerificationCodes`.
- OTP delivery is server-side only through configured webhooks.
- OTP request rate limits are recorded in `rateLimits`.
- OTP verification failures use Convex Auth's failed-attempt rate limiter.
- Sessions use Convex Auth refresh tokens with a 30 day total lifetime, 7 day inactive lifetime, and 1 hour JWT lifetime.
- Browser token storage uses `sessionStorage` for the Convex Auth path.
- Auth audit events are written for login, logout, failed login, OTP requested, OTP verified, and OTP failed.

## Accepted Security Decision: Browser Token Storage

Convex Auth currently stores client access and refresh tokens in browser storage for the React client flow. M5 configures Convex Auth to use `sessionStorage` instead of `localStorage`, which limits token persistence to the active browser tab session and avoids durable cross-session token storage.

This is accepted for the current MVP because Convex Auth manages session expiration, refresh, and logout invalidation, and because the application will treat XSS prevention as a critical security requirement. All future UI work must assume browser-readable tokens are present and must avoid unsafe HTML injection, unsanitized user-generated content, unsafe script sources, and dependency patterns that increase XSS risk.

A future hardening option is an httpOnly secure cookie or BFF-style authentication flow if the deployment model and Convex Auth support it, or if the product risk profile requires removing browser-readable auth tokens entirely.

## Account Linking

Convex Auth links accounts by verified email or verified phone. `userProfiles.authUserId` links the platform profile to the Convex Auth user. `userProfiles.ensureCurrent` first claims an existing verified email or phone profile before creating a new profile, which avoids duplicating a person who signs in through different providers.

Future providers should be added as Convex Auth providers and exposed through `AuthService`; application pages should not change.

## Required Server Environment

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_EMAIL_OTP_WEBHOOK_URL`
- `AUTH_EMAIL_OTP_WEBHOOK_SECRET` optional
- `AUTH_PHONE_OTP_ENABLED` optional, default disabled
- `SAKNAHA_SMS_ENABLED` required for actual SMS delivery
- `SAKNAHA_SMS_PROVIDER` optional, default selected provider `msegat`
- Provider credentials stay server-side; see [sms.md](./sms.md)
- Convex Auth setup values: `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS`

## Compatibility Period

The app continues to use localStorage login/register methods through `AuthService` while `auth.convexAuth.enabled` is false. This preserves the M3 migration strategy and allows Convex Auth to be enabled independently during staged rollout.
