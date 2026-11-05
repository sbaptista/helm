# Edit Trip from inside the trip (works offline)

**Status:** Built 2026-11-05 (v00.04.0026–0027). Tested by Stan on localhost 2026-11-05: online on all platforms; offline edit inside a trip syncs (iPhone). Opening a trip from the dashboard offline is to be checked on production (no service worker in development). Stan chose
decision **A** (later edit wins) and asked for the pencil button too.
Migration `supabase/migrations/202611050001_trips_updated_at.sql` **applied by
Stan 2026-11-05**.

### As built

- `components/advisor/EditTripModal.tsx`: shared window (dashboard and trip
  page), saves with `apiFetch`, title required (checked on blur).
- `TripSidebar.tsx`: **Edit Trip** (no connection needed); `TripDetailView.tsx`:
  44pt pencil after the dates in the 📍 line.
- `lib/offline/collections.ts`: `trips` collection (item URL `/api/trips/{id}`,
  envelope `{ trip }`, `listUrl()` → the same URL); `api-fetch.ts` queues only
  title/destination PATCHes, everything else on a trip still needs a
  connection. `sync.ts` and `FailedChangesSheet.tsx` read via `listUrl()`.
  `SyncConflicts.tsx` hides Recreate for a deleted trip.
- `lib/offline/store.ts`: `rememberTrips()` (one write for all trips);
  `hooks/useDeviceTrips.ts` shows device-copy values over
  the page, used by the dashboard and the trip page.
- `GET /api/trips/[id]` returns `{ trip }`.
- The pages still select explicit trip columns without `updated_at`, so they
  keep working before the migration is applied; sync reads `updated_at` from
  `GET /api/trips/[id]` (`select('*')`).

## Request

Stan: allow editing the trip (title, destination) from inside the trip, not
only from the dashboard, and make it work offline unless there is a technical
reason it can't.

## Research

- The dashboard's Edit Trip window (`components/advisor/DashboardView.tsx`)
  edits **title** and **destination** with `fetch` → `PATCH /api/trips/[id]`.
  Trip dates aren't editable; they come from the itinerary.
- The trip page (`components/advisor/TripDetailView.tsx`) has no edit control.
  Its side menu (`components/ui/TripSidebar.tsx`) has Print Trip, Import,
  Calendar and Logs.
- Offline saving (`docs/offline-editing-plan.md`, `lib/offline/`) only knows
  section records: `COLLECTIONS` in `lib/offline/collections.ts`, URLs
  `/api/trips/{tripId}/{collection}` and `/api/{collection}/{id}`. Trips are
  not on the list, so `apiFetch` would answer "This needs a connection".
- **No technical blocker.** The trip edit is a single-row PATCH with no side
  effects (no Calendar call; the Calendar isn't named after the trip). It fits
  the outbox. Three gaps to fill:
  1. **No device copy of the trip.** Section lists are kept on the device; the
     trip's own title/destination come from the server-rendered page, which
     the service worker serves from cache when offline. An offline edit would
     save but the page would still show the old title until synced.
  2. **No way for sync to read the server's current trip.** Sync reads
     `/api/trips/{tripId}/{collection}` to merge field by field; there is no
     read route for one trip (`app/api/trips/[id]/route.ts` has only PATCH and
     DELETE).
  3. **`trips` has no `updated_at`** (only the section tables got it in
     `202610300001_offline_updated_at.sql`). Without it, a same-field clash
     can't tell which edit was later.

## Proposed steps

1. **Shared window:** move Edit Trip out of `DashboardView.tsx` into
   `components/advisor/EditTripModal.tsx`, used by the dashboard and the
   trip page. Saves go through `apiFetch`.
2. **Trip menu:** add **Edit Trip** (pencil) to `TripSidebar.tsx`, enabled
   offline. Optionally also a ≥44pt pencil button beside the 📍 destination
   line on the trip page.
3. **Offline support for trips (`lib/offline/`):**
   - Recognise `PATCH /api/trips/{id}` for **title and destination only**
     (status changes on the dashboard stay online-only, as today), with the
     trip's own id as its trip id. Label in sync lists: `Trip "…"`.
   - Keep a device copy of each trip's title and destination (saved whenever
     the dashboard or trip page loads online), and update it on an offline
     edit.
   - Sync reads the server's current trip from a new read-only
     `GET /api/trips/[id]` and merges field by field, like the sections.
     "Use replaced value" on Logs works for trips too.
4. **Show offline edits at once:** the trip page (title bar, 📍 line, menu)
   and the dashboard card show the device copy's title and destination when
   it has a pending edit, and redraw when sync finishes.
5. **Version and changelog:** patch bump and a `lib/changelog.ts` entry.

## Decision for Stan

- **Same-field clashes on a trip** (title changed offline here and on another
  device): **A (recommended)** add `updated_at` plus its trigger to `trips`
  (migration for Stan to apply), so the later edit wins as in the sections.
  **B** no migration: this device's edit always wins, and the other value is
  kept on Logs under Sync conflicts.

## Database impact

| Question | Answer |
|---|---|
| New query pattern? | `GET /api/trips/[id]`: one row by primary key (already indexed). Read once per sync that includes a trip edit. |
| Realtime? | No. |
| Frequent writes? | No: the same single save, possibly delayed. |
| New table? | No. |
| New column? | Option A: `trips.updated_at timestamptz not null default now()` + update trigger. Not used in `WHERE`, so no index. |

## Verification

- Mac, iPad, iPhone: Edit Trip from the trip menu online — title bar, 📍 line
  and dashboard update.
- DEV "Simulate offline": edit title and destination in a trip — shown at once
  in the trip and on the dashboard; goes back online → syncs, no failed
  changes.
- Edit offline here and change the same field online elsewhere → one entry
  under Sync conflicts on Logs; "Use replaced value" restores it.
- Dashboard Edit Trip still works online and offline; status changes still
  say "Needs a connection" offline.
