# Overview timing tile, optional trip dates, one day per date — plan

**Superseded in part (2026-10-25, 00.04.0003):** §2's optional Start/End
fields were removed; trip dates now come from the itinerary
(`docs/itinerary-driven-trip-dates-plan.md`). The tile and one-day-per-date
parts stand.

**Status:** Approved and built 2026-10-25 as `00.04.0002` (typecheck and lint
clean). Not yet tested in the app. Migration
`supabase/migrations/202610250001_copy_trip_optional_dates.sql` was applied by
Stan on 2026-10-25 and verified (the live function contains the new date check).
As built, differences from the plan below: the day-date check runs only when a
day's date **changes**, so an existing duplicate can still be edited in place;
the whole first tile is the tap target when it links; the print packet's trip
dates now parse as local dates (they printed a day early in Hawaii).
Step 0 done 2026-10-25: `departure_date` and `return_date` are nullable `date`
columns, so the migration only recreates the `copy_trip` function.
**Target version:** next 00.04.x patch.
**Author:** 2026-10-25 — Claude Code (Opus 5.5)

## Decisions (Stan, 2026-10-25)

- Drop the departure/arrival concept. Travel legs go in day titles
  (e.g. a day titled "Departure").
- The Overview's first tile is driven by the **itinerary's** first and last
  dates, not the trip's own dates.
- A trip may have **no dates** yet (a placeholder for a trip you know you want).
- Single-day trips are allowed.
- **One itinerary day per date.**
- When a date has no itinerary day during the trip, show the **next** day.
- Trip date fields are renamed **Start date / End date**.

## 1. Overview first tile

"First" and "last" are the earliest and latest `day_date` among the trip's
non-deleted itinerary days. Today is the device's local date.

| When | Value | Label |
|---|---|---|
| No itinerary day has a date | **No dates set** | *(empty)* |
| Before the first date | **N** (days until first date) | Days to Go (**Day to Go** when N = 1) |
| First ≤ today ≤ last, a day exists today | **Underway** | that day's title, linked |
| First ≤ today ≤ last, no day today | **Underway** | "Next: *title* · Sat", linked |
| After the last date | **Completed** | *(empty)* |
| Status is Done (any dates) | **Completed** | *(empty)* |

- The link opens the Itinerary tab and highlights that day
  (`navigateTo('Itinerary', dayId)`, already supported).
- A day with no title links as "Untitled day".
- The tile reads from the Overview's existing timeline data, so no new query.
- The "Trip done" banner stays; its date line uses the itinerary's first and
  last dates and is omitted when there are none.

## 2. Trip Start and End dates: renamed and optional

- Labels: **Start date** / **End date** in New Trip, Copy Trip, the dashboard
  Edit form and the print packet's trip summary. Validation messages to match.
- Both empty is allowed. If one is set, both are required. End may equal Start.
- `POST /api/trips`, `PATCH /api/trips/[id]` and `POST /api/trips/[id]/copy`
  follow the same rules.
- **Migration:** `copy_trip` function currently rejects missing dates and
  `return <= departure`; recreate it to allow both-null and `return >= departure`.
  If step 0 shows the columns are `NOT NULL`, the migration also drops that.
- Wherever the trip's dates are displayed (dashboard card, trip header), show
  **No dates set** when empty instead of crashing on a null date.
- The Itinerary date pickers keep the Start/End limits when set, and have no
  limits when the trip has no dates.
- Database column names (`departure_date`, `return_date`) stay.

## 3. One itinerary day per date

- `POST /api/trips/[id]/itinerary/days` and `PATCH /api/itinerary/days/[dayId]`
  reject a date that another non-deleted day on the same trip already has:
  409, "There's already a day on Sat, Oct 24."
- The Add/Edit Day form shows that message on the Date field.
- Existing duplicates are left alone; they only block a further save that keeps
  the clash.
- The import is unchanged (it creates one day per document day).
- No unique index, since existing duplicates would make it fail. The check is
  a select by `(trip_id, day_date)` over a few dozen rows.

## Database impact

- One small extra read when saving a day. No Realtime, no new frequent writes,
  no new table or index.
- One migration (copy function; possibly date-column nullability).

## Step 0 — schema check (Stan runs, pastes result)

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'trips'
  and column_name in ('departure_date', 'return_date');
```

## Verification

- Test trip on each tile state, by changing its itinerary dates: future, today,
  a gap day, after the end, and status Done.
- A new trip with no dates: dashboard card, header and Overview show
  "No dates set"; Itinerary days can be added on any date.
- A one-day trip saves in New Trip, Edit and Copy Trip.
- Adding a second day on an existing date shows the error.
