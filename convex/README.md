# Convex Backend

This directory contains the Saknaha Convex application.

M4 establishes the foundation only:

- typed schema,
- validators,
- indexes,
- generated type boundary,
- migration/seed validation helpers,
- frontend adapter boundaries behind feature flags.

Authentication is introduced in M5 through Convex Auth and the frontend `AuthService` abstraction. Maps server actions are introduced in M7 through the shared `MapsProvider` abstraction. M8 adds the internal SMS/OTP delivery foundation. Media processing, notifications, monitoring, and admin dashboards remain out of scope until their approved milestones.
