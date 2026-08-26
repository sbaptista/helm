# Linked source records in Itinerary

> Superseded in v00.02.0055. Helm no longer projects source-section records into Itinerary; this document remains as historical context for the former behavior.

## Purpose

Helm treats flights, hotels, restaurant reservations, and transportation pickups as itinerary facts without copying those records into `itinerary_rows`. The source section remains the single place where each record is edited or deleted.

## Projection contract

| Source | Projected occurrences | Calendar events when included |
|---|---:|---:|
| Flight | Departure, arrival | One event spanning departure through arrival |
| Hotel | Check-in, check-out | Two 30-minute events |
| Restaurant | Reservation | One 30-minute event |
| Transportation | Pickup | One event |

Every projected occurrence provides a source section, source record ID, occurrence kind, local day, display time, timezone, All Day state, Estimated state, title, location, and summary. Itinerary renders it read-only and opens the original record when selected.

## Date and timezone rules

- Flight departure uses `departure_time` interpreted in `departure_timezone`.
- Flight arrival uses `arrival_time` interpreted in `arrival_timezone`.
- Hotel check-in and check-out use their date fields and the hotel's local timezone.
- Restaurant reservation and transportation pickup use their stored timestamp plus their source timezone.
- The assigned itinerary day is always the source location's local calendar date, never the UTC date portion.
- A dated occurrence with no time still appears as `Time TBD`.

## Mutation and refresh rules

Projected entries never write to `itinerary_rows`. Source mutations dispatch a refresh signal; mounted itinerary views refetch the bounded projection endpoint. Focus and visibility refresh cover changes made in another tab without an always-on database subscription.

## Calendar rules

Calendar inclusion belongs to the source record. A save that affects an included record marks it dirty. Turning inclusion off also marks it dirty when Calendar IDs exist, so the next Update All operation deletes the remote events before clearing their IDs. Each Flight has one Calendar event even though it projects two Itinerary entries. Derived itinerary entries never participate in the separate itinerary-row Calendar sync.

## Database impact analysis

- Query pattern: additional bounded reads by `trip_id` and `deleted_at`; no new index pattern.
- Realtime: none.
- Write frequency: only ordinary form saves; no render or keystroke writes.
- Tables: no new tables or RLS policies.
- Columns: boolean display metadata and one additional flight Calendar ID; none are used in `WHERE` or `JOIN` clauses requiring an index.
