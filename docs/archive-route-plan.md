# Trip routes security, Archive / Clear / Delete (A3) — plan

2026-11-06 — Claude Code (Opus 5.5). Status: **D1–D4 accepted by Stan 2026-11-06 (recommendations). Part 1 built as v00.04.0039 and tested by Stan 2026-11-06 (signed in: all as before; signed out: 401), with a wider scope than §1a listed (see §1c).** Part 2 built as v00.04.0040–0043 and tested by Stan 2026-11-06 (Archive removed in 0042, Clear Data wording in 0043): migration `202611060001_clear_trip_data.sql` (syntax checked with the PostgreSQL parser) must be applied first.
From `docs/import-fix-plan.md` task A3.

## 0. Archive removed (Stan, 2026-11-06)

Testing Part 2 showed the problem with D1: an archived trip had no data, yet its
status could still be changed, so "restoring" it gave an empty trip. Archive as
built was Delete under another name ("archive" suggests the data can come back),
and Done already keeps a finished trip's data. Stan agreed to remove it:

- The lifecycle is Draft → Upcoming → Active → Done; Delete is the only way to
  remove a trip. `TRIP_STATUSES` no longer includes `archived`.
- Trips archived before this keep the status but have no data: their card menu
  shows only Delete, `PATCH /api/trips/[id]` refuses to change them (409), and the
  dashboard's Archived filter shows only while such a trip exists.
- Clear Data (Download & discard, Discard data) stays, for starting a trip over.
- `clear_trip_data`'s `archive` mode is unused (left in the applied function).

D1 and D4 below are superseded by this; D2 and D3 stand.

## 1. What's wrong

### 1a. Security — routes anyone can call

`proxy.ts` protects pages (`/advisor`, `/traveler`), not `/api`. Each API route must
check the caller itself. These don't, and they use the service-role key, which
bypasses row-level security:

| Route | Methods | What anyone with a trip id can do |
|---|---|---|
| `/api/trips/[id]` | GET, PATCH, DELETE | read any trip, change its title / status, **delete the whole trip** |
| `/api/trips/[id]/clear` | POST | **delete every section's data** (Archive, Download & Clear, Discard) |
| `/api/trips/[id]/hotels` | GET, POST | read a trip's hotels, add hotels to any trip |

Trip ids are UUIDs (hard to guess), but they appear in URLs, printed pages and logs.
The Calendar routes are fine (`lib/gcal/request-user.ts`), and so is every other
section route checked (2026-11-06 sweep of `app/api`).

### 1c. Wider than first listed (found while building Part 1, 2026-11-06)

A per-handler audit of `app/api` (not per file) found 20 handlers with no check
and 4 that checked sign-in but not trip membership. All are fixed in Part 1 with
`lib/auth/trip-access.ts` (`requireTripMember`, `requireRecordMember`):

- No check at all: the GET of every section list under `/api/trips/[id]/…`
  (checklist, checklist-groups, flights, hotels, itinerary days and rows, key-info,
  key-info-groups, packing, packing-groups, packing-subgroups, restaurants,
  transportation), `/api/trips/[id]` GET / PATCH / DELETE, `/clear` POST,
  `/hotels` POST, and `/api/hotels/[id]` DELETE.
- Signed in but any trip: `/api/hotels/[id]` PATCH (which also accepted any column,
  including `trip_id`; identity, trip, timestamps and Calendar ids are now ignored)
  and `/api/trips/[id]/logs` GET / DELETE.
- Left open on purpose: health, version, client error logging, the sign-in email
  check; and the Google sign-in / calendar-list and timezone lookup routes, which
  are about the signed-in user, not a trip.
- The import routes moved from `lib/import/access.ts` (removed) to the same helper.

### 1b. Archive / Clear / Delete do the wrong thing

- **Wrong tables.** Archive, Clear and trip Delete delete from `checklist_items` and
  `packing_items`, tables Helm stopped using. So Checklist, Packing, their groups and
  sub-groups, and Key Info groups are **left behind** (Knowledge entry `787180b7`
  says Archive deletes Checklist and Packing; it doesn't). Trip Delete may fail
  outright if those leftovers block deleting the trip (depends on the foreign keys, §6).
- **Not one transaction.** Each table is deleted separately and errors are only
  written to the console, so a failure part-way leaves a half-deleted trip and
  still reports success.
- **The Clear Data dialog contradicts itself.** Its **Archive trip** option says
  "Mark the trip as archived and keep all data", but it sends `archive`, which
  deletes everything. **Download & clear** says it downloads "a JSON backup", but the
  file is only the import record (counts and flag decisions), not the trip's data.
- **The import record is never archived.** Archive reads `import_jobs.section_counts`
  / `flag_resolutions`, which don't exist (the column is `result_json`), so that
  step silently does nothing.
- **Calendar events are orphaned.** Rows are hard-deleted with their Google Calendar
  event ids, so their events stay in Google Calendar forever. Stan accepted this on
  2026-10-24; it's listed as a decision again (D3) because the fix is now cheap: the
  Calendar Clear code (`clearGoogleCalendarEvents`) already exists.

## 2. Proposed fix

### Part 1 — Security (small, ship first)

- One shared helper, `lib/auth/trip-access.ts`, generalising `lib/import/access.ts`:
  `requireTripMember(supabase, tripId, { role?: 'advisor' })` returns the user id
  or a 401 / 403 response. The import routes move to it; `lib/import/access.ts` goes.
- Apply it to the six handlers in §1a: GET → any member; PATCH, DELETE and Clear →
  advisor; hotels GET / POST → the same rule as the flights routes (signed-in member).
- No behaviour change for Stan; only callers who aren't signed in as a member of
  that trip are refused.

### Part 2 — Archive, Clear and Delete do what they say

- One database function, `clear_trip_data(p_trip_id, p_user_id, p_delete_trip boolean)`,
  `security definer`, service_role only, one transaction. It checks advisor
  membership, then deletes the trip's rows from every section table, children
  first: itinerary items, itinerary days, flights, hotels, transfers, restaurants,
  Key Info and Key Info groups, Packing items, sub-groups and categories, Checklist
  and Checklist groups, nearby dining, import records. With `p_delete_trip` it also
  deletes the trip's members and the trip itself. The exact list and order come from
  the pre-check query (§6), so nothing is missed and nothing fails on a foreign key.
  Either everything is deleted or nothing is, and an error is reported, not swallowed.
- **Archive** (trip card menu): calls the function, then sets status `archived`.
  Still one tap, no confirmation (Stan, 2026-10-24) unless D1 says otherwise.
- **Clear Data dialog**: see D2.
- **Delete**: calls the function with `p_delete_trip`.
- **Calendar (D3):** before deleting, if the trip has a Google calendar
  (`trips.gcal_calendar_id`), delete its events with the existing Calendar Clear code.
  If Google can't be reached, stop and say so, with **Archive anyway** to go ahead and
  leave the events.
- The dashboard's Archive / Clear / Delete need a connection, so they're dimmed
  offline like other server actions.

## 3. Files

- New `lib/auth/trip-access.ts`; `lib/import/access.ts` removed (its three callers move).
- `app/api/trips/[id]/route.ts`, `app/api/trips/[id]/clear/route.ts`,
  `app/api/trips/[id]/hotels/route.ts`.
- New migration `supabase/migrations/202611060001_clear_trip_data.sql` (Part 2).
- `components/advisor/DashboardView.tsx` (Clear dialog, offline, Calendar message).
- Changelog, version. Knowledge entry `787180b7` gets a SUPERSEDED IN PART banner
  (staged as an `orb-agent propose` for Stan to approve).

## 4. Releases

**Two.** Part 1 is a few lines per route, closes the security hole, and needs no
database change, so it can ship as soon as it's tested. Part 2 needs the pre-check
query, a migration and more testing.

## 5. Decisions (Stan accepted all recommendations, 2026-11-06)

| | Question | Decision |
|---|---|---|
| D1 | Archive still deletes on one tap with no confirmation (your 2026-10-24 choice). Keep? | **Keep**, now that it deletes everything correctly and Done exists for trips you want to keep. |
| D2 | The Clear Data dialog: its "Archive trip (keep all data)" option is wrong, and its "backup" isn't one. What should it offer? | **Two options:** **Discard data** (delete all the trip's data, keep the trip) and **Download & discard**, where the download is a real backup: every section's data as one JSON file. Remove "Archive trip" from the dialog (Archive is on the card menu). |
| D3 | Delete the trip's Google Calendar events when archiving, clearing or deleting? | **Yes**, with **Archive anyway** if Google can't be reached. |
| D4 | Keep writing the `import_archive` record on Archive? | **No.** It only ever held counts and never worked; the Download backup (D2) replaces it. The table is left as it is. |

## 6. Pre-check query (read-only, before Part 2)

Stan runs it once and pastes the result, so the function deletes exactly the right
tables in the right order:

```sql
-- Tables that reference trips, and what happens to their rows when a trip is deleted
select c.conrelid::regclass as child_table, a.attname as column_name,
       case c.confdeltype when 'c' then 'CASCADE' when 'n' then 'SET NULL'
            when 'r' then 'RESTRICT' when 'a' then 'NO ACTION' else c.confdeltype::text end as on_delete
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
where c.contype = 'f' and c.confrelid = 'public.trips'::regclass
union all
-- Every other foreign key between the trip's child tables (deletion order)
select c.conrelid::regclass, a.attname, 'refs ' || c.confrelid::regclass::text
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
where c.contype = 'f' and c.confrelid <> 'public.trips'::regclass
  and c.connamespace = 'public'::regnamespace
order by 1, 2;
```

Indexes on `trip_id` for the same tables (Part 2 deletes by `trip_id`):

```sql
select t.relname as table_name,
       bool_or(pg_get_indexdef(i.indexrelid) ilike '%(trip_id%') as has_trip_id_index
from pg_class t
join pg_index i on i.indrelid = t.oid
where t.relnamespace = 'public'::regnamespace
  and exists (select 1 from information_schema.columns c
              where c.table_schema = 'public' and c.table_name = t.relname and c.column_name = 'trip_id')
group by t.relname
order by 2, 1;
```

## 7. Database impact

- **Part 1:** one extra `trip_members` lookup per call to these six handlers
  (`trip_id, user_id`); every other section route already does it.
- **Part 2:** one function. Deletes are per trip (`where trip_id = …`), hundreds of
  rows at most, rare (Archive / Clear / Delete). Each child table needs an index on
  `trip_id` (the second query shows any that are missing; add them in the same
  migration). No Realtime, no new tables or columns. Hard deletes leave dead tuples
  that autovacuum clears; at this volume that's negligible.

## 8. Testing (localhost, Mac)

Part 1:
1. Signed in, everything works as before: open a trip, change its status, add a
   hotel, Archive, Clear, Delete.
2. Signed out (private window), each route returns 401: e.g. `fetch('/api/trips/<id>')`.

Part 2 (on throwaway trips):
3. Archive a trip with items in every section, including Packing, Checklist, their
   groups and Key Info groups: all are gone, the trip shows as Archived.
4. Clear Data → Download & discard: the file has every section; the trip remains, empty.
5. Delete a trip with Packing and Checklist: it's gone, with no error.
6. With the trip on Google Calendar: its events are removed. With Google
   disconnected: the message and **Archive anyway**.
7. iPad and iPhone: the Clear dialog's options at 44pt.

## 9. Pre-check results

**Indexes (Stan, 2026-11-06).** Tables with a `trip_id` column, and whether any index
covers it:

- Indexed: audit_log, calendar_events, documents, flights, hotels, import_jobs,
  itinerary_days, itinerary_rows, key_info, restaurants, transportation, trip_members.
- **Not indexed:** checklist, checklist_groups, feedback, helm_logs, import_archive,
  key_info_groups, nearby_dining, notifications, packing, packing_groups,
  packing_subgroups.

Checklist and Packing (and their groups) are read by `trip_id` on every visit to those
sections, so each read scans the whole table. Part 2's migration adds
`create index if not exists idx_<table>_trip_id on public.<table> (trip_id)` for the
unindexed tables Helm queries by trip (checklist, checklist_groups, key_info_groups,
packing, packing_groups, packing_subgroups, nearby_dining, helm_logs), which also
serves the deletes. feedback, notifications and import_archive get one only if
the foreign-key result shows they belong to a trip's data.

Tables this query surfaced that the code never mentions: audit_log, calendar_events,
documents, feedback, notifications. The foreign-key query decides whether Archive /
Delete must remove their rows.

**Foreign keys (Stan, 2026-11-06).** Deleting a trip row **cascades** to: trip_members,
itinerary_days, itinerary_rows, flights, hotels, transportation, restaurants, key_info,
key_info_groups, packing, packing_groups, packing_subgroups, checklist,
checklist_groups, nearby_dining, import_jobs, documents, calendar_events,
notifications, feedback. It **sets `trip_id` to null** in audit_log and helm_logs
(logs are kept). `import_archive` has **no** foreign key (its rows outlive the trip).

So trip Delete already removed everything through the cascade (the stale
`checklist_items` / `packing_items` deletes just failed quietly); what it lacked was the
caller check (Part 1) and Calendar cleanup. Archive and Clear keep the trip row, so
they must delete the children themselves, in this order (children before the rows
they reference): itinerary_rows → itinerary_days; nearby_dining → hotels; key_info →
key_info_groups; packing → packing_subgroups → packing_groups; import_jobs →
documents; calendar_sync_log (no trip_id; by calendar_event_id) → calendar_events;
then flights, transportation, restaurants, checklist, checklist_groups,
notifications, feedback, import_archive. trip_members, audit_log and helm_logs stay.

Indexes added in Part 2: `trip_id` on checklist, checklist_groups, key_info_groups,
packing, packing_groups, packing_subgroups, nearby_dining, helm_logs, feedback,
notifications (all cascade targets, so a trip delete no longer scans them).
