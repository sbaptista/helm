# Create Trip localhost authentication fix

## Status

Implemented after Stan's approval on 2026-08-25.

## Research summary

The dashboard accepts `BYPASS_AUTH_USER_ID` during localhost development, but `CreateTripModal` previously required a browser Supabase session and inserted directly with the publishable client. In bypass mode, the form therefore stopped at `auth.getUser()` with no usable session. The resulting general error appeared at the top of the scrollable form and could be outside the current view.

The live REST schema was inspected before implementation. `trips` supports the existing title, destination, departure date, return date, description, status, and created-by fields; `trip_members` supports trip ID, user ID, and role. No schema migration is required.

## Implemented steps

1. Added an authenticated `POST /api/trips` route that resolves either the development bypass user or the real cookie-authenticated user.
2. Added server-side required-field, ISO-date, and date-order validation.
3. Moved trip and advisor-membership creation behind the server boundary.
4. Added best-effort cleanup of a newly inserted trip if advisor-membership creation fails.
5. Made client and server validation errors scroll into view inside the open modal or bottom sheet.

## Database impact

- Query pattern: two bounded inserts for each successful explicit Create action; one bounded cleanup delete only if membership creation fails.
- Realtime: none.
- Write frequency: one user-submitted operation, never per render or keystroke.
- Tables: existing `trips` and `trip_members` only.
- Columns and indexes: no new columns, joins, filters, or index requirements.

## Platform and verification

- Verify validation and successful creation on Mac modal layout.
- Verify the iPad and iPhone bottom-sheet layouts keep errors visible and retain 44-point action targets.
- Confirm the new draft appears immediately after creation and opens normally.
