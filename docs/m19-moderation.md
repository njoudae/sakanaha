# M19 moderation and publishing

## Development admin

- Use the normal “باحثة عن سكن / شريكة سكن” phone login.
- The account is created locally with `platformRole: "admin"` and opens `/admin` automatically.
- This compatibility account exists only when the local-storage authentication adapter is active.

For a Convex deployment, provision an authenticated user profile with `primaryRole: "admin"` through the deployment’s controlled operator process. Never expose development provisioning in production.

## Publishing states

New properties and roommate cards are stored as `pending_review` and are not returned by public listing functions. An administrator can approve, reject with a reason, request changes, archive, or delete them. Approval is the only transition that makes a submission public.

## Required property submission data

- Region
- City
- District
- Verified coordinates
- At least one uploaded image
- Completed payment when `PUBLISHING_FEE_ENABLED=true`

Roommate cards store only approximate coordinates and never expose exact personal coordinates publicly.
