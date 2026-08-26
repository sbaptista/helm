# Separate Itinerary from travel sections

## Status

Approved by Stan, implemented, and live-verified in v00.02.0055 on 2026-08-25.

## Purpose

Keep Itinerary explicitly authored. Flights, Hotels, Restaurants, and Transportation remain authoritative, independent sections and no longer appear automatically as read-only Itinerary entries.

## Application scope

- Remove linked source entries from the Itinerary screen.
- Count only stored `itinerary_rows` in the Overview timeline.
- Print only stored `itinerary_rows` in 8.5×11 itineraries and 3×5 Daily Itinerary cards.
- Remove the linked-itinerary projection utility and API endpoint.
- Remove source-section events that existed only to refresh linked Itinerary entries.
- Preserve source-section timing fields and Google Calendar behavior.

## Trip cleanup scope

Soft-delete all active `itinerary_rows` and `itinerary_days` belonging to `Canadian Rockies Adventure v2` (`453c0c22-0010-46a7-9f5c-2eefda35e6cd`). Soft deletion keeps the cleanup recoverable. Do not modify the original trip or any Flights, Hotels, Restaurants, Transportation, Checklist, Packing, or Key Info records.

## Database impact

- Query patterns: removes four bounded source-section reads from Itinerary and Overview; adds none.
- Realtime: none.
- Writes: one explicit cleanup operation updating 43 itinerary rows and 11 itinerary days; no recurring write path.
- Schema: no new table, column, index, trigger, function, or RLS policy.

## Verification

- TypeScript, focused ESLint, and production build pass.
- Itinerary, Overview, 8.5×11 print, and 3×5 Daily cards contain no derived source-section entries.
- The target copy has zero active itinerary days and rows after soft-deleting 11 days and 43 rows.
- Copy counts remained unchanged: 4 Flights, 6 Hotels, 8 Transportation, 15 Restaurants, 40 Checklist, 79 Packing, 25 Key Info, and 1 membership.
- The original trip remained unchanged with 11 active itinerary days and 44 active itinerary rows.
