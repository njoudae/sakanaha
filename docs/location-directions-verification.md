# University-to-housing location verification

## Existing architecture verified

- University selection appears in the housing search, user-location flow, user profile editor, and
  each property location section.
- A selection is a campus/branch, not only a university. Every exposed branch has an external branch
  ID, university ID/name, campus name, city, coordinates, and active status.
- Guest selection is stored in `sessionStorage`, so it survives navigation and refreshes in the same
  browser tab. Local accounts also store the branch ID on the local user record.
- Convex-authenticated accounts store one `selectedUniversityBranchId` on `userProfiles`; the branch
  is restored after login and across devices. Saving replaces the single reference and does not create
  duplicate preferences. A current guest selection is synchronized after authentication.
- Normal property details, owner preview, and roommate-opportunity details share the same
  `PropertyLocationMap`. Roommate requests resolve their linked `propertyId`; no separate roommate
  coordinates are stored.
- Favorites and saved interests navigate to the normal property details page, so they inherit the
  same location behavior. The current admin dashboard has no implemented property-review detail page,
  and there is no separate reserved-housing detail route; no frozen placeholder UI was expanded.

## Property input and direction behavior

- The approved owner form accepts a full Google Maps HTTPS link containing coordinates. It supports
  `@lat,lng`, `!3dlat!4dlng`, and coordinate query parameters.
- Links are allowlisted to official Google Maps hosts. Short links, arbitrary hosts, non-HTTPS
  protocols, missing coordinates, invalid ranges, `0,0`, and likely Saudi latitude/longitude swaps
  are rejected with Arabic feedback. Short links are not followed or resolved.
- Coordinates are normalized to six decimal places. Valid coordinates outside the expected Saudi
  region require explicit owner confirmation, allowing future regional expansion.
- Owners choose exact, approximate, or private visibility using the existing form styling.
- Directions use the free Google Maps URL with the selected campus as origin, property as destination,
  and driving mode. No API key or paid request is involved.
- Approximate public markers are rounded to two decimals and cannot generate exact directions. Private
  locations are hidden from public viewers. Owner preview may use exact coordinates.
- Straight-line distance is labelled explicitly. Provider route failures no longer fabricate driving
  distance or duration, and unverified legacy time/distance labels are not displayed.

## Maps and security

- The Leaflet map displays whichever valid markers are available and only renders matching legend
  entries. Property and campus markers remain visually distinct.
- Tooltip labels are inserted through `textContent`, preventing stored HTML/XSS from property or
  campus labels.
- The browser contains no Google or Mapbox secrets. Paid Google/Mapbox calls remain behind
  `SAKNAHA_MAPS_PAID_CALLS_ENABLED=false` by default; the free directions URL is independent.
- `propertyLocations.getForViewer` applies server-side publication, ownership, role, and precision
  rules for Convex location reads. Guests cannot retrieve private or draft coordinates through it.
- Provider actions reject invalid coordinates, `0,0`, and unreasonable address-query lengths before
  provider or cache access.

## Rollback

1. Revert the location utility, component, owner-form, Convex query/action, and tests listed in the
   completion report.
2. Keep `SAKNAHA_MAPS_PAID_CALLS_ENABLED=false` throughout rollback.
3. No schema migration or destructive data rollback is required.
