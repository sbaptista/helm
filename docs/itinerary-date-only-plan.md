# Itinerary by date only (no day numbers) — plan

**Status:** Approved and built 2026-10-25 (typecheck and lint clean). Not yet
tested in the app or in print. As built: Itinerary drops the "Day N" line above
the date heading; packet headings are "Saturday, Oct 24 — Title"; 3×5 daily
card fronts are "Sat, Oct 24 — Title" with the trip title as the sub-line, and
backs "Sat, Oct 24 — Details"; the import links rows to days through each day's
`sort_order` (its index in the import) instead of a stored number.

**Target version:** part of `00.04.0000`.
**Author:** 2026-10-25 — Claude Code (Opus 5.5)

## Problem

Days added by hand show **"Day null"**: only the import sets
`itinerary_days.day_number`. Numbering from a departure date doesn't fit every
trip either (a staycation of scattered day trips on Oahu).

**Decision (Stan, 2026-10-25):** drop day numbering. A day is identified and
ordered by its date alone.

## Where `day_number` is used today

| Place | Use | Change |
|---|---|---|
| `components/sections/ItineraryClient.tsx:651` | "Pre-Trip" / "Day N" heading over the date | Heading becomes the date, e.g. **Sat, Oct 24** |
| `components/trips/overview/OverviewClient.tsx:77` | Timeline label: "PRE-TRIP", else date, else "Day N" | Date only; "No date" if the day has none |
| `components/sections/OverviewSection.tsx:54`, `app/api/trips/[id]/overview/route.ts:66` | Select + secondary sort | Sort by `day_date`, then `sort_order` |
| `app/advisor/trips/[id]/page.tsx:69` | Day list sorted by number | Sort by `day_date`, then `sort_order` |
| `app/advisor/trips/[id]/print/page.tsx:53,150` | Packet sorted by number; heading "Day N: Title" | Sort by date; heading **Sat, Oct 24 — Title** |
| `components/advisor/print/CardPrintView.tsx:22,227,243,262` | `day-N` card type; card headers "Day N: Title" / "Day N — Details" | Remove `day-N` (no screen offers it; only reachable by URL); headers use the date |
| `app/advisor/trips/[id]/print/page.tsx:21-24` | Accepts `card=day-N` | Accept only the named cards |
| `types/sections.ts:103`, `ItineraryClient.tsx:24` | Type field | Remove from the types |
| `app/api/trips/import/*` | Extraction schema links rows to days by `day_number`; confirm stores it | Keep the number **only as a link key inside the import**; stop storing it |

## Behaviour changes to note

- **Pre-Trip label goes away.** A day before the trip's start date shows just
  its date, in date order. (It was only ever set by the import, as day 0.)
- **Same-date days** keep the order they have now (`sort_order`).
- **Imported days without a date** sort last and show "No date". The Add Day
  form already requires a date.
- **Print** headings show the date. The 3×5 daily cards already printed the
  date under the heading, so that sub-line becomes the trip title or is dropped.

## Database

- Column `itinerary_days.day_number` stays for now, unused, so nothing breaks
  if an old client or script reads it. Dropping it is a later, separate
  migration once 00.04.0000 has run on production.
- New sort is `(trip_id, day_date, sort_order)` filtered on `deleted_at is
  null`. A trip has tens of days, so no new index is needed.
- No Realtime, no new writes.

## Verification

- The Test trip: hand-added days show dates, not "Day null", on Itinerary and
  Overview.
- The Rockies trip (imported): same order as before; headings now dates.
- Print packet and each 3×5 category, including daily, on Mac.
- Typecheck and lint.
