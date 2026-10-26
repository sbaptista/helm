# Trip "Completed" status — plan

**Status:** Approved by Stan 2026-10-24. Steps 3–6 built (typecheck and lint
clean); version set to `00.04.0000`. Step 1 done 2026-10-24: `trips.status` is
plain `text` (default `'draft'`) with no check constraint, so **step 2 is not
needed** and no migration ships. The PATCH route's `TRIP_STATUSES` check is the
only guard on status values.

**Revised 2026-10-24 (Stan):** the status is **Done**, not Completed: stored value
`done`, label "Done" (fits the existing pill size). Overview shows a "Trip done"
banner and a "Trip Status: Done" tile. Read "completed" below as "done".
Attention Required stays visible on done trips. No Archive confirmation:
Stan decided it isn't needed.

**Target version:** part of `00.04.0000` (changes from the first real trip).
**Author:** 2026-10-24 — Claude Code (Opus 5.5)

## Problem

After the first real Helm trip, there is no way to say a trip is finished.

- Statuses today: `draft | upcoming | active | archived` (`types/trips.ts`,
  duplicated in `components/ui/Badge.tsx`).
- **Archive is not "completed".** The dashboard's Archive menu item calls
  `POST /api/trips/[id]/clear` with `action: 'archive'`, which **deletes every
  section's data** (itinerary, flights, hotels, transportation, restaurants,
  checklist, packing, key info) before setting `status = 'archived'`. It runs
  on one click with no confirmation (`DashboardView.tsx` `handleArchive`).
- The Overview's "Days to Go" tile shows **Underway** for any date after
  departure, so a finished trip still reads as in progress.

## Decision

Add a `completed` status that keeps all data. Lifecycle becomes:

**Draft → Upcoming → Active → Completed → Archived**

Completed is set by hand from the trip card's Status pills, like the others.
No automatic change when the return date passes.

## Steps

1. **Schema check first (shared rule 4).** Stan runs the query below in the
   Supabase SQL editor and pastes the result, so we know whether `trips.status`
   is plain text, a check constraint, or an enum.
2. **Migration** `supabase/migrations/20261024xxxx_trip_completed_status.sql`
   adding `'completed'` to whatever step 1 shows (drop and recreate the check
   constraint, or `ALTER TYPE … ADD VALUE`). Stan applies it.
3. **Types:** add `'completed'` to `TripStatus` in `types/trips.ts`; make
   `Badge.tsx` import that type instead of keeping its own copy.
4. **Dashboard:**
   - `Badge.tsx`: Completed colours (navy tint, distinct from Active green and
     Archived grey).
   - `TripCard.tsx`: label "Completed".
   - `TripCardMenu.tsx`: add a Completed pill after Active, with matching colours.
   - `DashboardView.tsx`: add a Completed filter between Active and Archived.
5. **API:** `PATCH /api/trips/[id]` currently accepts any `status` string.
   Reject values outside the five statuses (400).
6. **Overview** (`app/advisor/trips/[id]/page.tsx` → `OverviewSection` →
   `OverviewClient`): pass `status` through. When completed:
   - a banner at the top: **"Trip completed"** with the travel dates
     (e.g. "Oct 3 – Oct 14, 2026"), large readable text;
   - the first stat tile reads **Completed** instead of a day count or
     "Underway".
7. Version `00.04.0000`, changelog entry, HANDOFF, and the lifecycle memory.

## Open questions for Stan

- On a completed trip, should Overview still show **Attention Required**, or
  hide it?
- Should **Archive** get a confirmation that says it deletes the trip's data?
  (Separate from this change, but risky right after a trip.)

## Database impact

No new query pattern, no Realtime, no frequent writes, no new table or
indexed column. Only the allowed values for `trips.status` change.

## Schema query (step 1)

```sql
select column_name, data_type, udt_name, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'trips' and column_name = 'status';

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.trips'::regclass and contype = 'c';
```

## Verification

Mac, iPad and iPhone on localhost: set a trip to Completed from the card menu,
see the badge and filter, open the trip, see the banner and tile; set it back
to Active and confirm both disappear. Check the 44pt hit target on the new pill.
