# Copy Trip

## Status

Implemented and live-verified after Stan's approval on 2026-08-25. The migration was applied successfully, and Helm created and opened `Canadian Rockies Adventure — Copy` (`b0fac6a1-fdf4-4999-ae51-2606ec85ab33`).

## Purpose

Create a complete working duplicate of an existing Helm trip so the original remains available as a reference while the copy is updated with new travel documents.

## Copy contract

The copy is created as a Draft with an editable name, destination, departure date, and return date. The following active user-facing records are copied with new IDs and corrected relationships:

- itinerary days and rows;
- flights;
- hotels and nearby dining;
- transportation;
- restaurants;
- checklist groups and items;
- packing groups, subgroups, and items;
- Key Info groups and records; and
- advisor and traveler memberships.

Checklist, packing, action, confirmation, note, and ordering state are preserved so the copy is a working duplicate rather than an empty template.

## Deliberate exclusions and resets

- Soft-deleted records are not copied.
- Google Calendar IDs, trip Calendar linkage, inclusion, and dirty state are reset to prevent duplicate remote events.
- Logs, audit records, import jobs and archives, uploaded-document records, feedback, notifications, and generated Calendar records are not copied.
- Trip Mode is disabled and the copied trip starts in Draft status.

## Architecture

1. The dashboard ellipsis menu opens a responsive Copy Trip form.
2. `POST /api/trips/[id]/copy` authenticates either the real cookie session or Helm's localhost bypass and verifies advisor membership.
3. The service-only `copy_trip` PostgreSQL function performs all inserts in one transaction.
4. JSONB ID maps reconnect itinerary rows to copied days, nearby dining to copied hotels, packing records to copied groups/subgroups, and Key Info to copied groups.
5. After success, Helm navigates directly to the new Draft.

## Database impact

- Query pattern: bounded reads and inserts by one source `trip_id` during an explicit copy action.
- Realtime: none.
- Write frequency: one user-triggered transaction, never per render or keystroke.
- Tables and columns: existing tables and columns only.
- Indexes: no new filter, join, or ordering pattern requiring an index.
- Schema object: one service-only transactional function; no new table, column, RLS policy, or trigger.

## Platform and verification

- Verify menu and form behavior on Mac, iPad, and iPhone.
- Apply `202608250001_copy_trip.sql` before testing a successful copy.
- Confirm every copied section count and relational mapping against the source trip.
- Confirm Calendar IDs and inclusion are reset and operational-history tables have no rows for the new trip.
- Confirm the new Draft opens immediately while the source remains unchanged.

## Verification result

- The dashboard menu, responsive form, copy request, and direct navigation passed on localhost.
- All active section counts matched except one source itinerary row named `fubar`; it was intentionally not copied because its parent itinerary day was soft-deleted.
- All copied itinerary-day, hotel/nearby-dining, packing-group/subgroup, and Key Info group relationships point to records inside the new trip.
- The advisor membership was preserved.
- Trip-level and record-level Google Calendar state was reset.
- Audit logs, import jobs and archives, documents, feedback, notifications, generated Calendar records, and Helm logs have zero rows for the copied trip.
- The original trip remains intact.
