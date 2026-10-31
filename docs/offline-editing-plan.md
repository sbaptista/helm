# Offline editing, Apple Notes style — plan

**Status:** Proposed 2026-10-29; Stan accepted all five recommended decisions
the same day (end of file). **Phase A built 2026-10-29 as `00.04.0006`–`0009`;
Phases B and C built together 2026-10-30 as `00.04.0010`** (Stan: "Implement
everything now then I'll test"). Typecheck and lint clean; not yet tested.
Migration `supabase/migrations/202610300001_offline_updated_at.sql` applied
by Stan 2026-10-30 and verified with its check query (13/13 tables with
`updated_at` and the trigger; see "Phases B–C as built").

**Phases B–C as built (00.04.0010).**
- `lib/offline/`: `status.ts` (one online flag; `confirmOnline()`),
  `collections.ts` (the 13 record types and their URL patterns; Flights'
  `{ flights }` / `{ flight }` envelope), `store.ts` (device copy, outbox,
  conflicts; **localStorage** key `helm-offline-v1`, not IndexedDB: synchronous
  and well within its limit), `api-fetch.ts`, `sync.ts`, `router.ts`.
- **`apiFetch` replaces `fetch` in the eight section clients.** Online with
  nothing waiting, it sends as before and updates the device copy from the
  reply. Offline, while earlier changes wait, or when a 5xx turns out to mean
  offline, it queues the change and returns what the server would (201 with
  the record, 200 with the merged record, `{ success: true }`). List GETs
  offline come from the device copy with waiting changes applied. Anything
  else (packing reset, trip settings, Calendar) answers 503 "needs a
  connection" while offline.
- **Every create carries a client UUID**, online too. The three create routes
  that whitelist fields (flights, itinerary rows, restaurants) now accept
  `id`; the rest spread the body. A replay that hits `duplicate key` counts as
  done.
- **`useOfflineList(url, serverItems, setItems, seed)`** in each section: seeds
  the device copy from server props (online with nothing waiting, or when there
  is no copy yet); applies waiting changes on mount; redraws on
  `helm:offline-data` (after a sync or a discard). `seed` is off in form-only
  mode, whose props hold one record.
- **`useRouter` from `lib/offline/router.ts`** in the sections: `refresh()`
  does nothing offline (Next would turn a failed refresh into a full reload).
- **Sync** (`flushOutbox`): oldest first, one at a time, on reconnect (then
  `router.refresh()`), on mount and when shown with changes waiting, and right
  after a change is queued while online. For an update it reads the server's
  current record once per run and merges field by field (§5): only-mine and
  only-theirs changes both kept; a field both changed goes to the later edit
  (`updated_at` vs the time of the offline edit) and the other value becomes a
  conflict. Deleted elsewhere: the delete wins, the edit becomes a conflict.
  A 401 waits (never discards); other refusals become failed changes.
- **Pill** (`OfflinePill`): Offline / Offline · N changes waiting / Syncing… /
  N changes couldn't be saved (tap: `FailedChangesSheet`, Try again or
  Discard) / N edits replaced · see Logs. **Logs** shows **Sync conflicts**
  for the trip (`SyncConflicts`), with "Use replaced value" / "Recreate" and
  Dismiss.
- Flight times are converted to instants on the device
  (`normalizeZonedDateTime`), as the server does, so lists show them right
  before the sync.
- **Not live until the sync:** the Overview (server-rendered), linked travel
  records in the Itinerary (computed on the server), "[Inserted day]" days,
  Google Calendar, and server cascades (e.g. deleting a day hides its items
  only after the sync).
- **Known limit:** a same-field clash is decided per record, by its
  `updated_at`; formats the form and server write differently (times) are
  compared loosely and any wrong call is restorable from Logs.

**Phase A as built: different mechanism for §1, same result.** Phase A
doesn't need the IndexedDB copy or the snapshot route. The dashboard and trip
pages are server-rendered with all their sections, so the service worker's
saved copy of a page is already a readable copy of the trip:
- `public/sw.js` (caches v6) saves the dashboard and trip pages under their
  path (query ignored). It also saves the page's scripts and styles, so a page
  saved in the background runs offline even if it was never opened on that
  device. A redirected page (sign-in) is never saved. A page with no saved
  copy gets a short "not saved on this device yet" page.
- **Refreshing:** `hooks/useOfflineWarmup.ts` asks the service worker to
  re-save pages: the trip page and dashboard from a trip, plus the dashboard
  and every Upcoming and Active trip from the dashboard. It does this on mount,
  when the app is shown or hidden, and on reconnect, at most every 2 minutes
  per page. Also, any save (`POST`/`PATCH`/`DELETE` to `/api/`) re-saves the
  page it came from 4 seconds later, so the offline copy includes it.
- Offline, Next's failed in-app navigation falls back to a full page load,
  which the service worker answers from its saved copy.
- `OfflineGuard` shares one online status via `OnlineStatusContext` /
  `useIsOnline()` (still one poll, now also reacting to the browser's
  `online`/`offline` events). It shows `OfflinePill` ("Offline · read only")
  on the dashboard and trip pages, keeps `OfflinePage` everywhere else, and
  calls `router.refresh()` on reconnect.
- Offline, Calendar, Print, Import and Logs show a "needs a connection" toast
  (the sidebar dims them), and New Trip and the trip card menu are unavailable.
  Edits inside sections aren't blocked in Phase A: a save made offline fails
  as it does today. Phase B is the fix.
- Manifest `app/manifest.ts` (start URL `/advisor/dashboard`), static icons
  (`app/apple-icon.png`, `public/icons/helm-192.png` and `-512.png`, the ship's
  wheel on square navy; static since 00.04.0007 because the Home Screen showed
  a page snapshot), `appleWebApp` metadata, and `navigator.storage.persist()`.
- **00.04.0007:** `useOnlineStatus` treats the browser's offline report as
  final. On localhost the server is the Mac itself and kept answering with
  Wi-Fi off, so the status flipped back to online and the reconnect refresh
  rendered the page without Supabase, landing on sign-in.
- **Phase B still needs** the device store (§1) for the outbox and for
  showing pending changes over the saved page.
- **Testing:** the service worker only runs in production builds, so offline
  reading can only be checked on production. On localhost, only the pill and
  the "needs a connection" gating can be checked (Wi-Fi off with a trip open).
**Target version:** 00.04.0006 onward, one patch per phase.
**Author:** 2026-10-29 — Claude Code (Opus 5.5)

## Request (Stan, 2026-10-29)

Plan offline editing, modelled on apps like Apple Notes, while accepting that
Helm is a web app.

## What Apple Notes does, and what Helm would copy

| Notes behaviour | Helm equivalent |
|---|---|
| Opens instantly with what it had last time, connected or not | Trips open from a copy kept on the device; the network only refreshes it |
| An edit is saved the moment you make it, on the device | Saving a form or ticking a checklist item saves locally first and shows at once |
| Syncs quietly when a connection comes back | A queue of pending changes is sent in order when Helm is online again |
| Never blocks you for being offline | No full-screen offline page inside a trip; a small "Offline" pill instead |
| Shows sync state discreetly | The pill says "Offline · 3 changes waiting", then "Syncing…", then disappears |
| Rarely asks about conflicts | Changes that touch different fields merge; only a same-field clash is shown (decision 3) |

## Where Helm is today

- **Offline = blocked.** `OfflineGuard` in `app/layout.tsx` polls `/api/health`
  every 10 s and, when it fails, replaces the whole app with `OfflinePage`
  (the starry screen). Knowledge `2ea34410` records that rule.
- **Service worker** (`public/sw.js`, production only): caches static chunks
  and the HTML of pages already visited (network first). It never touches
  `/api/`. It is unregistered in development, so localhost never has it.
- **Data comes from the server only.** The trip page is server-rendered
  (`force-dynamic`); each section loads and saves through `/api/...` routes,
  then calls `router.refresh()`. Nothing is stored on the device.
- **No web app manifest**, so a Home Screen icon is just a Safari bookmark.
  This matters on iPhone and iPad (below).
- **Trips can be shared** (`permission_preset`, member checks in the routes),
  so two people can edit the same trip.

## Design

### 1. A copy of each trip on the device

- New `lib/offline/store.ts`: an IndexedDB database with one record set per
  table (flights, hotels, transportation, restaurants, itinerary days and rows,
  checklist and groups, packing and groups/subgroups, key info and groups) plus
  the trip itself.
- New read-only route `GET /api/trips/[id]/snapshot` returns the whole trip
  in one response. Helm calls it when a trip opens online and on tab focus, and
  writes the result to the store.
- **Which trips are kept:** Upcoming and Active trips are refreshed whenever
  the dashboard loads online, so they are ready before you lose signal. Other
  trips are kept once opened.
- The sections read from the store, with the server props as the first fill.
  Online, it all looks the same as today; offline, the store is the only
  source.
- Derived views keep working offline because they already compute from the
  records: linked itinerary items (`projectLinkedItineraryEntries`), trip
  dates (`tripRangeFromDays`), the Overview timing tile.

### 2. Opening Helm with no connection

- The service worker also caches the dashboard and trip page shells, so a cold
  start offline loads the app. The page then fills from the store rather than
  from server-rendered data.
- `OfflineGuard` stops blocking trip and dashboard pages. They show a small
  pill in the trip top bar instead. The full offline page stays only where
  nothing can work offline: sign-in, import, Google Calendar connect.
- `useOnlineStatus` stays the single source (one poll, per `2ea34410`), and also
  listens to the browser's `online`/`offline` events so it reacts faster.

### 3. Saving offline: the outbox

- Every section's save, delete, tick and reorder goes through one helper,
  `lib/offline/mutate.ts`, in place of its direct `fetch` call. The helper
  then:
  1. updates the store, so the screen changes at once;
  2. adds the change to an **outbox** (also in IndexedDB, so it survives
     closing the app or the phone restarting);
  3. sends it straight away if online.
- **The outbox sends changes in order, one at a time**, when Helm comes back
  online, when the app is opened or brought to the front, and after each
  successful save. Safari has no background sync, so changes go when Helm is
  next open with a connection, not while it is closed. (Notes behaves the same
  on a phone with no connection.)
- **New records get their ID on the device** (a UUID) so they can be edited or
  deleted before they reach the server. The routes accept a client-supplied
  `id`, and creating the same ID twice does nothing, so a retry after a dropped
  connection never makes a duplicate.
- **Edits send only the changed fields**, which lets edits to different fields
  from two devices merge.
- **Deletes** are already soft (`deleted_at`), so sending one twice is harmless.
- **A failed change** (validation, permission) stays in the outbox, marked,
  and appears in the pill as "1 change couldn't be saved". Tapping it shows
  the record, with Retry or Discard. Nothing is dropped silently.
- **Sign-in:** if the session expired while offline, the outbox waits. Helm
  asks you to sign in and sends the changes afterwards; it never discards them.

### 4. Server-side effects, after sync

Some saves do more than write a row. Offline, these wait until the change
reaches the server, where they already run:

- Google Calendar create/update/delete (needs Google).
- `ensureDaysForLinkedRecord`, which inserts "[Inserted day]" days. Offline,
  a linked item on a date without a day is still shown in the Itinerary under
  its date, marked "day added when online". The day itself is created on sync.
- WARN counts and Action Required update locally from the store.

Not available offline (the button is disabled, with "Needs a connection"):
document import, Copy Trip, Print/Export (it is server-rendered; it could
come later), Google Calendar connect and push, search across trips, and
creating or deleting whole trips (decision 4).

### 5. Conflicts

Each change records the server's `updated_at` for the record when it was last
read. On sync, the server compares fields:

- **Different fields changed** (e.g. you fixed the seat while your companion
  fixed the time): both changes are kept with no prompt.
- **Same field changed on both:** see decision 3. The recommended rule is that
  the later edit wins and the overwritten value appears in a "Sync conflicts"
  list on the Logs screen. That list lets you restore it, and the pill shows it
  once ("1 edit replaced"). Notes behaves the same way.
- **Record deleted elsewhere while edited offline:** the delete wins. The
  offline edit goes into the same list, where you can recreate the record.

### 6. iPhone and iPad specifics

- **Safari deletes a website's stored data after 7 days without a visit**,
  unless the site is added to the Home Screen as a web app. So Helm needs a
  **web app manifest** (name, icons, `display: standalone`), and each device
  should open Helm from its Home Screen icon. Helm also asks the browser for
  persistent storage (`navigator.storage.persist()`).
- Storage needed is small: a trip is a few hundred rows, well under 1 MB.

### 7. Testing on localhost

The service worker is turned off in development (`ServiceWorkerKiller.tsx`),
and the dev server only runs under `helm-dev`. Plan:
- The store and outbox (§1, §3) work without the service worker. They are
  tested on localhost by turning Wi-Fi off on the iPad or iPhone while a trip
  is already open, or by using a DEV-panel "Simulate offline" switch that makes
  `useOnlineStatus` report offline and holds the outbox.
- Cold start offline (§2) needs the service worker, so it is checked on
  production after release, as Calendar connect is now.

## Phases

| Phase | Version | What you get | Risk |
|---|---|---|---|
| **A. Read offline** | 00.04.0006 | Trips open and read offline; the offline page is replaced by the pill inside trips; manifest; Upcoming/Active trips pre-loaded | Low: no write changes |
| **B. Edit lists offline** | next | Checklist, Packing, Key Info, Itinerary days and rows go through the outbox; conflict handling; DEV "Simulate offline" | Medium: touches every save in those sections |
| **C. Edit travel records offline** | next | Flights, Hotels, Restaurants, Transportation through the outbox; Calendar and inserted days on sync | Medium: Calendar side effects |

Each phase is tested before the next starts. Phase B covers the commonest
offline case: ticking items and noting things on the road.

## Database impact

| Question | Answer |
|---|---|
| New query pattern? | The snapshot route reads every section table for one trip, by `trip_id` with `deleted_at IS NULL`, the same filters the sections use today, in one request instead of nine. Existing `trip_id` indexes cover it (to confirm with the schema query). |
| Realtime? | No. Refresh on open and on tab focus, as today. |
| Frequent writes? | No more than today: the same saves, delayed. On reconnect, a short burst of queued saves, sent one at a time. |
| New table? | No. The outbox and the trip copy live on the device. Sync conflicts are logged to the device and shown on Logs (no `helm_logs` rows; they aren't errors). |
| New column? | `updated_at timestamptz not null default now()` plus a trigger that sets it on update, on each section table that lacks it, for conflict detection. Not used in `WHERE`, so no index. |

**Schema check before building (schema first):** I need, for each section
table, whether `updated_at` exists and whether `id` defaults to
`gen_random_uuid()` and accepts a supplied value. I'll give you the query when
we start Phase B. Phase A needs no migration.

## Knowledge

When built: supersede `2ea34410` (OfflineGuard blocks every route) in part;
the guard keeps blocking only sign-in, import and Calendar connect.

## Decisions (Stan, 2026-10-29: all as recommended)

1. **Phases:** build A, then B, then C, testing between each (recommended).
   Or all at once?
2. **Which trips are kept on the device:** Upcoming and Active automatically,
   others once opened (recommended). Or every trip, or only trips opened?
3. **Same-field conflicts:** the later edit wins, with the replaced value kept
   in a "Sync conflicts" list on Logs (recommended, like Notes). Or ask each
   time (a prompt with both versions)?
4. **Creating whole trips offline:** not in this plan (recommended; trips
   are usually created at home). Include it?
5. **Home Screen web app:** OK to add a manifest and icon, and to install Helm
   from the Home Screen on iPad and iPhone? That's what keeps offline data from
   being cleared after 7 days.
