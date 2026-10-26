# Itinerary-driven trip dates, Overview sync, linked "next day" — plan

**Status:** Approved and built 2026-10-25 as `00.04.0003` (typecheck and lint
clean). Not yet tested in the app. As built: the derived range lives in
`lib/trip-range.ts`; the dashboard reads itinerary days with the service client,
limited to trips the user advises (the signed-in client's access to
`itinerary_days` wasn't confirmed); `lib/trip-dates.ts` is removed; the
`/api/trips/[id]/overview` route also returns the derived range. The timeline
list in the Overview is titled "Trip Timeline" in the app.
**Target version:** next 00.04.x patch.
**Author:** 2026-10-25 — Claude Code (Opus 5.5)
**Supersedes:** the "Start/End dates, optional" part of
`docs/overview-trip-timing-plan.md` (§2). Its tile and one-day-per-date parts stay.

## Stan's test results (2026-10-25)

1. Deleting today's itinerary day left the Overview stale.
2. The tile's subtitle should match the day as the Overview's **Trip Itinerary**
   list shows it, and that day should be highlighted in the list.
3. A trip's dates should come from its itinerary, always in sync. No dates are
   entered when creating a trip; until days exist it says "No dates set".

## 1. Overview refreshes after Itinerary changes

**Cause:** the trip page renders the Overview on the server. Other sections call
`router.refresh()` after saving, which re-renders it; the Itinerary does so only
after saving an item. Adding, editing or deleting a **day**, and deleting an
**item**, don't refresh.

**Fix:** call `router.refresh()` after those four actions in
`ItineraryClient.tsx`. Add `export const dynamic = 'force-dynamic'` to the trip
page so production never serves a cached render after a refresh (the same rule
the dashboard already follows).

## 2. Tile subtitle matches the Trip Itinerary list, and that day is highlighted

The Overview's right-hand **Trip Itinerary** list shows each day as its date
(e.g. **Mon, Oct 26**) and its title. The tile uses the same text:

| Case | Tile label |
|---|---|
| A day exists today | **Today: Sun, Oct 25 · Beach day** |
| No day today | **Next: Mon, Oct 26 · Fun in the Sun** |

- Date format is exactly the list's, so the two always read the same. (Stan's
  example said "October"; the list uses "Oct". Both will change together if a
  longer month is wanted.)
- That day's row in the list gets a highlight: navy outline box and light
  background, plus "Today" or "Next" as a small tag, so it is clear without
  colour alone.
- Tapping the tile still opens the Itinerary with that day highlighted.

## 3. Trip dates come from the itinerary

A trip's start and end are the earliest and latest dates among its active
itinerary days, computed whenever a page is drawn. Nothing is stored, so there
is nothing to fall out of sync.

| Where | Change |
|---|---|
| New Trip | Remove Start/End fields |
| Copy Trip | Remove Start/End fields. The copy keeps the source's itinerary dates as they are (no date shifting) |
| Dashboard Edit | Remove Start/End fields |
| Dashboard trip card | Range from the trip's itinerary days, or **No dates set** |
| Trip header (all tabs) | Same |
| Overview | Already itinerary-driven (tile and "Trip done" banner) |
| Itinerary | Day and item date pickers lose the trip Start/End limits, since the itinerary now defines the range |
| Print packet trip summary | Start/End from the itinerary, or "No dates set" |
| Import | The document reader is told the itinerary's current range, or "unknown" |

- API: `POST /api/trips`, `PATCH /api/trips/[id]` and the copy route stop
  accepting dates. `lib/trip-dates.ts` is removed.
- `Trip` type: `departure_date`/`return_date` become `start_date`/`end_date`,
  filled from the itinerary, so no code reads the stored columns by mistake.
- Database: `trips.departure_date`/`return_date` stay but are no longer read or
  written. Dropping them is a later cleanup. No migration now; the already
  applied `copy_trip` change accepts the nulls Copy Trip will send.

## Database impact

- Dashboard query embeds each trip's `itinerary_days(day_date)` (active only):
  one joined read, tens of rows per trip. No new index.
- `router.refresh()` after itinerary edits re-runs the trip page's server
  queries once per edit, as the other sections already do. No Realtime.

## Verification

- Delete, add and re-date days: Overview tile, timeline, header and dashboard
  card all follow without a manual reload.
- New trip: no date fields; "No dates set" on card, header, Overview; first day
  added sets the range.
- Tile label and the highlighted timeline row match, for Today and Next.
- Copy Trip and Edit work without date fields.
- Print packet summary shows the itinerary range.
