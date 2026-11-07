# Bulk selection on every list page (task A5)

2026-11-06 — Claude Code (Opus 5.5). **D1–D7 accepted by Stan 2026-11-06.**

**Progress (release 1):** v00.04.0047 — shared pieces (`app/api/trips/[id]/bulk/[section]/route.ts` for all six sections, `hooks/useSelection.ts`, `components/ui/BulkSelection.tsx`, `.select-bar` in `globals.css`) and Flights. Flights tested by Stan 2026-11-06; 0048 centred the bar's count. v00.04.0049 — Hotels, Restaurants, Transportation, Key Info (Move to Group), Itinerary (hand-made rows, day checkboxes, Move to Day) and Checklist Calendar ✓/✗, all through `useListBulk` in `BulkSelection.tsx`. Tested by Stan 2026-11-06. v00.04.0050 — **Clear** button in every selection bar (Stan: no way to deselect the current picks except Select All, then Deselect All). Tested by Stan 2026-11-06.

**Progress (release 2):** v00.04.0051 — migration `supabase/migrations/202611060002_copy_records.sql` (`copy_records`, **not yet applied**; parsed with the PostgreSQL parser; columns taken from `copy_trip`, `copy_checklist`, `copy_packing_list`), `app/api/trips/[id]/copy-records/route.ts` (advisor; passes the linked dates of travel records shown in the Itinerary), `useCopyToTrip` in `BulkSelection.tsx`; Copy to Trip in Actions… on the six pages and in the Checklist and Packing selection bars. Not tested. v00.04.0052: Itinerary Select is on whenever the trip has entries; bookings say which page changes them, and a trip with only bookings shows a note in the bar (Stan, 2026-11-07: "inserted rows" wouldn't make sense to most people). **v00.04.0053: Itinerary selection removed entirely** (Stan, 2026-11-07: copying packing lists, checklists, restaurants and hotels has a clear use; itineraries much less so). The Itinerary page has no Select, Move to Day or Copy to Trip; `itinerary-rows` is gone from both routes. The applied `copy_records` keeps its unreachable `itinerary_rows` branch.

**As built, differs from the plan:** Copied Itinerary rows on a date the other trip lacks get an "[Inserted day]" (the convention travel records already use), not a copy of the source day. Itinerary Move to Day moves only All Day and Time TBD rows. A timed row's `start_time` is a full date and time, so changing its day alone would leave the time on the old date; those rows are left in place and the sheet and message say so.

## 1. Where things stand

- **Packing** and **Checklist** already have selection (v00.04.0012–0021): a **Select / Done** button, 44pt `SelectBox` on rows and group headings, a pinned bar with Select All and "N selected (M not shown)", actions, `BusyOverlay` progress, and one bulk request through `apiBulk()` (falls back to one change per record offline). Shared pieces live in `components/ui/SelectionControls.tsx`.
- **Flights, Hotels, Restaurants, Transportation, Itinerary, Key Info** have none. Their records are opened by tapping the row (edit form). Each has single-record PATCH/DELETE routes under `/api/<collection>/[id]`, all offline-capable collections.
- Per-record switches that exist today, and are therefore candidates for bulk:

| Page | Attention Required | Show in Itinerary | Google Calendar | Other |
|---|---|---|---|---|
| Flights | ✓ | ✓ | ✓ (needs departure + arrival date) | |
| Hotels | ✓ | ✓ | ✓ (needs dates) | |
| Restaurants | ✓ | ✓ | ✓ (needs date) | |
| Transportation | ✓ | ✓ | ✓ (needs date) | |
| Itinerary rows | ✓ | — | ✓ (needs a day) | day |
| Key Info | ✓ | — | — | Show in Overview, group |

Overview and Logs: **excluded**. Overview is a summary, not a list. Logs already has its own clear; selecting log entries adds little.

## 2. Decisions for Stan

**D1 — What can be selected.**
- Flights, Hotels, Restaurants, Transportation, Key Info: every record.
- Itinerary: hand-made rows only. Linked travel entries (flights, hotels… shown with Show in Itinerary) are edited on their own page, so they show no checkbox. Each day heading gets a checkbox that selects that day's hand-made rows (like a group heading on Checklist). Days themselves are still deleted one at a time from the day's edit form.
- Key Info: group headings select their items, as on Checklist.

**D2 — Bulk actions (recommendation).**

| Action | Flights | Hotels | Restaurants | Transport | Itinerary | Key Info | Checklist | Packing |
|---|---|---|---|---|---|---|---|---|
| Delete (with confirmation) | new | new | new | new | new | new | has | has |
| Attention Required on / off | new | new | new | new | new | new | has | — |
| Show in Itinerary on / off | new | new | new | new | — | — | — | — |
| Google Calendar on / off | new | new | new | new | new | — | new | — |
| Show in Overview on / off | — | — | — | — | — | new | — | — |
| Move to group / day | — | — | — | — | Move to day | Move to group | has | has |
| Copy to Trip (selected) | new | new | new | new | new | new | new | new |

- **Delete** works exactly like deleting one record: soft delete, Calendar turned off, and records with Calendar events left as tombstones for the next sync to remove (Knowledge `35671b7f`). Confirmation names the count ("Delete 4 flights?").
- **Calendar on** skips records that can't sync (no date, Itinerary row not on a day) and says so: "3 added to Google Calendar; 1 skipped — no date". **Calendar off** marks records with events so the next Update All removes them — same as unticking one record.
- **Mark complete** stays Checklist-only (no other section has a done state; Packing has Packed).
- Checklist and Packing keep everything they have; they gain only the rows marked "new".

**D3 — How it works by touch (iPad, iPhone, and Mac).** Same model as Packing and Checklist, so all eight pages behave alike:
- **Select** button in the page toolbar (44pt) turns selection mode on; it becomes **Done**.
- In selection mode, tapping a row toggles it (it no longer opens the edit form); every row and heading shows a 44pt checkbox. Selected rows are tinted.
- The pinned bar below the trip top bar shows **Select All / Deselect All**, "N selected", and one **Actions…** button. Actions open a bottom sheet of full-width 44pt buttons — six or more buttons don't fit an iPhone bar, and a sheet keeps them large and labelled.
- Progress uses `BusyOverlay`; results come back as one toast ("4 flights deleted").
- No long-press, swipe or hover: long-press fights scrolling on iOS and isn't discoverable; hover doesn't exist on touch.

**D4 — Shared code.** Build once, use on all six new pages:
- `hooks/useSelection.ts` — selected ids, toggle, select-all over the visible list, heading state (none/some/all), clears on Done.
- `components/ui/SelectionBar.tsx` and `components/ui/BulkActionsSheet.tsx` (sheet stays mounted, per Knowledge `b70fda2f`).
- One route, `POST /api/trips/[id]/bulk/[section]` with `{ action: 'update' | 'delete', ids, fields }`, a per-section whitelist of fields, the section's Calendar columns for dirty-marking, `requireTripMember`, max 1000 ids. Called through the existing `apiBulk()`, so updates and deletes **work offline** (queued per record) like Packing and Checklist.
- Checklist and Packing keep their own bulk routes for now (they work and are tested); moving them onto the shared route can come later.

**D5 — Copy to Trip of selected records.** One Postgres function, `copy_records(p_source_trip, p_target_trip, p_user, p_section, p_ids)` — security definer, service_role only, one transaction — behind `POST /api/trips/[id]/copy-records`. Targets come from the existing `/copy-targets` list (the user's other trips where they're an advisor). The caller must be an advisor on both trips. **Online only**, like the existing Copy to Trip.
- Copies keep the record's fields; Calendar state is reset (off, no event ids). Dates are kept as they are.
- Already there: a record matching one in the target trip is skipped and reported ("2 copied, 1 already there") — flights by flight number and departure date, hotels by name and check-in, restaurants by name and date, transfers by origin, destination and date, Key Info by label within its group, Itinerary rows by title on the same date.
- Itinerary rows go to the target's day with the same date, which is created if missing (one day per date, Knowledge `2247755d`). Key Info and Checklist go into the group with the same name, created if missing. Packing goes to the same person / category / sub-group, created if missing (same rules as `copy_packing_list`).
- Checklist and Packing: their existing whole-list Copy to Trip stays; this adds copying just the selected items.

**D6 — One release or two.** Recommend **two**:
1. **Selection and in-trip actions** (D1–D4): Delete, Attention, Show in Itinerary, Calendar, Show in Overview, Move. No migration. Tested page by page.
2. **Copy to Trip of selected records** (D5): one migration, one function, the new action on all eight pages.

Two smaller releases keep each round of testing manageable, and the first needs nothing from the database.

**D7 — Order of pages in release 1.** Flights first (it sets the pattern), then Hotels, Restaurants, Transportation (same shape), then Key Info, then Itinerary (day headings and linked rows make it the odd one).

## 3. Database impact

| Question | Answer |
|---|---|
| New query pattern? | Bulk: `update … where trip_id = $1 and id = any($2) and deleted_at is null` — primary key lookups. Copy: duplicate checks in the target trip by `trip_id`, and itinerary days by `(trip_id, day_date)`. |
| Indexes? | None new. `trip_id` is indexed on flights, hotels, restaurants, transportation, itinerary_days, itinerary_rows, key_info (Stan's query, 2026-11-06) and on checklist, checklist_groups, key_info_groups, packing* since migration `202611060001`. |
| Realtime? | No. |
| Write frequency? | Only on a user action. One bulk action = at most two `UPDATE` statements (Calendar dirty-mark, then the change), up to 1000 rows. Copy = one transaction of inserts. No per-keystroke writes. |
| New tables or columns? | None. Release 2 adds one function (no RLS changes; service_role only). |

## 4. Not included

- Moving Checklist and Packing onto the shared bulk route (later, optional).
- Selecting whole Itinerary days (delete days one at a time, as now).
- Bulk editing of other fields (times, notes, addresses).
