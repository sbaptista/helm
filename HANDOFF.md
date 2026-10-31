# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.04.0010` local, **not committed or released** (offline reading 0006–0009; offline editing, Phases B–C, 0010). **Migration `202610300001_offline_updated_at.sql` applied by Stan 2026-10-30** (check query: all 13 tables have `updated_at` and the trigger). Last release: `00.04.0005`, 2026-10-29 (production and `origin/main` at `06b318e`, via review + `helm-release`)
- **Branch:** main
- **Dev server start:** `/usr/local/helm-bin/helm-dev` (passphrase prompt). There is no `.env.local`: secrets live only in the encrypted store `Project-secrets/helm-secrets/helm.env.enc` (plaintext removed 2026-10-23), and the TLS leaf is in `helm-secrets/tls/`. Plain `npm run dev` refuses to start.
- **Dev server:** user-started on port 3000 in the `developer` account; devices use `https://stanleys-macbook-pro.local:3000` (Bonjour only). Leaf (originally `localhost+1.pem`, now `helm-secrets/tls/helm-dev.pem`) re-issued 2026-10-16 from the admin mkcert CA for `localhost`, `127.0.0.1`, `::1`, `Stanleys-MacBook-Pro.local` (verified, expires 2029-01-16)
- **Development account:** canonical clone `/Users/developer/Projects/helm`; read-only GitHub token; releases: `git -C /Users/developer/Projects/helm push review main` as `developer` (Stan's approval), then `/usr/local/helm-bin/helm-release` as admin. See Orb `docs/orb-non-admin-development-account-plan.md`
- **Live URL:** https://helm-gilt.vercel.app

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | Itinerary-driven timing tile (Days to Go / Underway + today's or next day, linked and highlighted in the Trip Timeline / Completed / No dates set); Done banner; refreshes after Itinerary edits | 00.04.0003 |
| Checklist | Functional + WARN system + required validation + scroll-to-error | 00.02.0026 |
| Packing | Functional — checkboxes rebuilt as native inputs | 00.01.0157 |
| Key Info | Functional + required validation | 00.02.0014 |
| Transportation | Functional + WARN system; Show in Itinerary (pickup); form-only mode for editing from the Itinerary | 00.04.0005 |
| Hotels | Functional + WARN system; Show in Itinerary (check-in/check-out); form-only mode | 00.04.0005 |
| Flights | Functional + local endpoint timing; Show in Itinerary (departure/arrival); form-only mode | 00.04.0005 |
| Restaurants | Functional + WARN system; Show in Itinerary (reservation); form-only mode | 00.04.0005 |
| Itinerary | Days by date only; one day per date; defines the trip's dates; lists linked travel records (read-only, edited with their own form opened in place); "[Inserted day]" for records on new dates | 00.04.0005 |
| Printing | Packet + server-data 3×5 PDF modes; day headings by date; linked travel records included; packet times in local time | 00.04.0004 |
| Calendar | Secondary-calendar clearing, rebuild queue, deleted-event cleanup; Itinerary all-day events dated from their day | 00.03.0011 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized; Done status + filter; no trip date entry (dates from itinerary, "No dates set" placeholders) | 00.04.0003 |
| Version System | Update banner + What's New + dashboard, trip footer, and sidebar labels | 00.02.0051 |
| Offline | Read (service worker's saved pages, Upcoming/Active pre-loaded) and edit (all eight sections; device copy + outbox in `lib/offline/`, synced in order on reconnect, field-level merge, conflicts in Logs, failed changes in the pill). Online-only: Calendar, Print, Import, Logs, trip actions, new trips. `docs/offline-editing-plan.md` | 00.04.0010 |

---

## Last Session Completed

**2026-10-30 — Claude Code (Opus 5.5) — v00.04.0010 (uncommitted):** offline editing, Phases B and C together (Stan: "Implement everything now then I'll test"). New `lib/offline/` (status, collections, store, api-fetch, sync, router), `hooks/useOfflineList.ts`, `components/ui/FailedChangesSheet.tsx`, `components/sections/SyncConflicts.tsx` (in Logs); all eight section clients use `apiFetch`, the offline-safe `useRouter` and `useOfflineList`; create routes for flights, itinerary rows and restaurants accept a client `id`; flights GET returns `trip_id`, `updated_at`; migration `supabase/migrations/202610300001_offline_updated_at.sql` (`updated_at` + trigger on 13 tables, idempotent). Details: the plan's "Phases B–C as built".

**2026-10-29 — Claude Code (Opus 5.5) — v00.04.0006–0009 (uncommitted):** offline editing plan `docs/offline-editing-plan.md` (Apple Notes model; Stan accepted all five recommended decisions) and **Phase A, offline reading**, built (typecheck and lint clean). Phase A uses the service worker's saved copy of the server-rendered pages instead of the planned IndexedDB store (see the plan's "Phase A as built"). Files: `public/sw.js` (caches v6), `hooks/useOfflineWarmup.ts`, `hooks/useOnlineStatus.ts` (`OnlineStatusContext`, `useIsOnline`), `components/ui/OfflineGuard.tsx`, `components/ui/OfflinePill.tsx`, `app/manifest.ts`, `app/layout.tsx`, `components/ui/ServiceWorkerKiller.tsx`, `components/ui/TripSidebar.tsx`, `components/advisor/TripDetailView.tsx`, `DashboardView.tsx`, `TripCardMenu.tsx`, changelog, version. **Offline reading can only be tested on production** (no service worker in development). **00.04.0007 (Stan's first test):** the Home Screen showed a page snapshot instead of the icon, so the icons are now static files (`app/apple-icon.png` replaces `app/apple-icon.tsx`; `public/icons/helm-192.png`, `helm-512.png` for the manifest), same ship's wheel, square. Wi-Fi off on the Mac led to the login screen: the browser reported offline, the 10 s poll of the local server reported online, and the "reconnect" `router.refresh()` rendered the page while Supabase was unreachable. `useOnlineStatus` now treats `navigator.onLine === false` as final. **00.04.0008:** `app/favicon.ico` (was the default Next.js triangle) replaced with the wheel (16/32/48/256). **00.04.0009:** still no pill on the Mac with Wi-Fi off (the browser kept reporting online, and the server log showed a flight PATCH failing with `ENOTFOUND` for Supabase). In development, `/api/health` now also checks that the server can reach Supabase (`/auth/v1/health`, 3 s timeout; any HTTP response counts).

Before that, **2026-10-26 → 2026-10-29 — Claude Code (Opus 5.5) — v00.04.0004–0005**, linked itinerary items (`docs/linked-itinerary-items-plan.md`, incl. "Revision 1"). Stan tested on localhost 2026-10-29.

1. **00.04.0004 — travel records shown in the Itinerary (one-way link).** Re-introduces the v00.02.0048 read-time projection (removed in v00.02.0055 with no recorded reason; Stan didn't remember why), now **opt-in per record**: `show_in_itinerary` on flights, hotels, transportation, restaurants (migration `202610260001_show_in_itinerary.sql`, also updates `copy_trip`; **applied and verified by Stan 2026-10-27**). New records default checked; existing unchecked. `lib/itinerary/linked-entries.ts` (restored from `563666a`) computes entries at read time; never stored in `itinerary_rows`. `ensureDaysForLinkedRecord` runs after every create/update in the 8 section save routes and the import, inserting a day for any record date without one. Itinerary, Overview timeline counts, packet and 3×5 cards include linked items; Calendar and actions stay with the record. Import marks travel records linked and its prompt no longer emits itinerary rows for them. Fixed: packet printed itinerary times in UTC.
2. **00.04.0005 — Revision 1 (Stan's testing).** Inserted days are neutral: `[Inserted day]`, no day type (they had taken the record's title and the flight type). Tapping a linked item opens the record's own edit form over the Itinerary: each section client gained a **form-only mode** (`formOnlyRecordId`, `onFormOnlyDone`) instead of the planned separate `*EditSheet` components; sheet markup moved within each file unchanged (verified). Section clients sync their lists from refreshed props.
3. Earlier this session: `docs/ai-safeguards-assessment-2026-10-26.md` (Stan's four questions on AI safeguards; nine ranked improvements, top three: separate dev database, key rotation, bypass gating).
4. Change log: `scratch/v00.04-batch2-changes.md` (untracked).

---

## Uncommitted Changes

- Helm, v00.04.0006 Phase A (all uncommitted): modified `HANDOFF.md`, `app/api/health/route.ts`, `app/api/trips/[id]/flights/route.ts`, `app/api/trips/[id]/itinerary/rows/route.ts`, `app/api/trips/[id]/restaurants/route.ts`, all eight `components/sections/*Client.tsx` (not Logs: `LogsClient.tsx` also modified), `public/sw.js`, `hooks/useOnlineStatus.ts`, `components/ui/OfflineGuard.tsx`, `components/ui/TripSidebar.tsx`, `components/ui/ServiceWorkerKiller.tsx`, `components/advisor/TripDetailView.tsx`, `components/advisor/DashboardView.tsx`, `components/advisor/TripCardMenu.tsx`, `app/layout.tsx`, `lib/changelog.ts`, `lib/version.ts`, `app/favicon.ico`; deleted (staged) `app/apple-icon.tsx`; new `lib/offline/` (6 files), `hooks/useOfflineList.ts`, `components/ui/FailedChangesSheet.tsx`, `components/sections/SyncConflicts.tsx`, `supabase/migrations/202610300001_offline_updated_at.sql`, `docs/offline-editing-plan.md`, `hooks/useOfflineWarmup.ts`, `components/ui/OfflinePill.tsx`, `app/manifest.ts`, `app/apple-icon.png`, `public/icons/`.
- Untracked `scratch/` (change logs and Knowledge drafts).
- Orb repo: `docs/agent-security-review-2026-09-30.md` (modified 2026-10-23, uncommitted in Orb). **Deferred by Stan (2026-10-24):** leave it uncommitted for now; commit it from an Orb session later.

---

## Knowledge Entries Due at Completion

✅ **v00.04.0004–0005 Knowledge saved 2026-10-29** via `orb-agent-approve`, verified by Claude by reading back: new entry `f310c415` (linked itinerary items, one-way, opt-in; text identical to the draft; links `124da363`, `2247755d`, `ee3c63de`, `f9e785de`); SUPERSEDED IN PART banners on `4bba13d8` and `a27452ca`, earlier banners kept below.

Earlier: v00.04.0000–0003 Knowledge saved 2026-10-25 (`787180b7`, `2247755d`, `124da363`, `af1bed21`; banners on `a27452ca`, `f60d4e3e`).

---

## Key Decisions

- **Dashboard is CRUD hub**: All trip management happens on the dashboard. Trip detail view is read-only + import + calendar.
- **Trip status lifecycle**: Draft → Upcoming → Active → Done → Archived. Upcoming = confirmed but not yet traveling. Done = over, all data kept. Archive deletes section data (no confirmation, by choice).
- **Itinerary is the source of trip dates**: a trip's start/end are its first/last active itinerary day (`lib/trip-range.ts`), never stored. A trip with no days shows "No dates set". `trips.departure_date`/`return_date` are legacy and unused.
- **A day is its date**: no day numbers; one itinerary day per date per trip; order by `day_date`, then `sort_order`.
- **Travel records → Itinerary is one-way**: flights, hotels, restaurants, transfers with `show_in_itinerary` are listed in the Itinerary, computed at read time (`lib/itinerary/linked-entries.ts`), never copied into `itinerary_rows`. All edits, actions and Calendar happen on the record (its form opens over the Itinerary). A record on a date with no day inserts a neutral `[Inserted day]`; Helm never deletes days.
- **force-dynamic on mutation pages**: Any page where client actions mutate data and calls `router.refresh()` must export `const dynamic = 'force-dynamic'`.
- **Version bump = production push**: Every version change ships. No version exists only in dev.
- **Auth shell variant system**: Variant A (navy + stars + wheel) is default. Variant B preserved via DEV toggle.
- **Service worker**: network-first for navigation, cache-first for static assets. Disabled in development. Since 00.04.0006 it also keeps the dashboard and trip pages (and their scripts and styles) for offline reading, keyed by path. Online status comes from one poll in `OfflineGuard`; components read it with `useIsOnline()`.
- **Dev bypass**: server-side `BYPASS_AUTH_USER_ID` + login form `dev@dev.local`. **Corrected 2026-10-21:** only the login-form shortcut is development-gated (`isDev`). The server variable is honoured wherever it is set, and `proxy.ts` has login disabled in every environment (`docs/helm-secrets-encryption-plan.md` §2.1).
- **Branching**: Currently working on main directly. May evolve to feature branches merged to main for production — same version/push principle applies.
- **Scroll-to-first-error pattern**: Shared utility in `lib/form-utils.ts` finds first `role="alert"` inside the active `role="dialog"` and scrolls into view. All edit forms use toast + scrollToFirstError() on validation failure.
- **Help button over settings page**: What's New lives in a ResponsiveSheet opened from Help button. Extensible for future sections without committing to a full settings page.
- **Update banner at very top**: Fixed above header (z-index 110 > header 100), header offsets down via `onVisibilityChange` callback + `BANNER_HEIGHT` constant.
- **Centralized section types**: `types/sections.ts` defines typed interfaces for all DB section tables. Import from there instead of using `any` for Supabase query results.
- **Calendar lifecycle**: included dirty records create/update events; excluded dirty records delete any stored remote events before clearing IDs and dirty state.
- **Calendar authority**: a stored Google calendar ID is only a pointer; Google CalendarList validation determines whether the calendar still exists and is accessible.
- **Flight time contract**: Helm displays airport-local time with its date-correct timezone abbreviation. Persist and sync the real instant computed from local date/time plus IANA timezone; calendar applications render that instant in the viewer's active timezone.
- **Timezone selector identity**: one option per stored IANA identifier; cities sharing identical rules use a combined label rather than duplicate values.
- **TBD timing identity**: `day_id` attaches an item to a dated itinerary day; a non-all-day null `start_time` intentionally represents Time TBD.
- **Clear means rebuild**: Clear Calendar deletes Google events, removes obsolete event IDs, and marks every included record dirty for the next Update All.
- **Delete means pending Calendar removal**: soft-deleted linked records remain dirty tombstones until Update All removes remote events and clears their stored IDs.
- **One print data boundary**: Both 8.5×11 packets and 3×5 cards load data through the authenticated print route. Exact-size cards retain the validated `html2canvas` → `jsPDF` engine and Epson-tested margins.

---

## Next Priorities

0. **Offline (00.04.0006–0010):** migration applied and verified 2026-10-30 (13/13 tables with trigger). **Conflict test passed on localhost 2026-10-30** (Stan: iPhone in airplane mode and iPad online edited the same field; on reconnect the later iPad edit was kept and the iPhone value appeared in Logs with Restore). iPhone Safari reaches the Bonjour URL once the link is opened from Messages (typing it ran a Google search; Firefox and Edge opened it directly). Earlier Phase A note: Stan tests the pill and the gating on localhost (Wi-Fi off on a device with a trip open), then the release. Offline reading is checked on production: add Helm to the Home Screen on iPhone and iPad, open a trip, go offline (airplane mode), reopen Helm, switch trips. Then Phase B (offline edits for lists: schema check for `updated_at` and client IDs first). At release: Knowledge, SUPERSEDED IN PART banner on `2ea34410` (OfflineGuard).
1. **Done 2026-10-29:** v00.04.0005 released (`06b318e`, with `6b74242`); Knowledge saved. iPad and iPhone checked on production by Stan (2026-10-29; also closes the device check pending from the encryption plan).
2. **Done 2026-10-25:** v00.04 Knowledge saved (4 entries, 2 banners).
2a. **Agent Knowledge access (Stan, 2026-10-25):** Helm agents read Knowledge via `orb-agent` and stage writes as proposals (`knowledge-create`, prepend-only `knowledge-update` banners, `todo-close`), added to `orb-agent` in an Orb session the same day. AGENTS.md updated.
3. Stan's next batch of trip-driven changes (in progress). **Done 2026-10-29 (Stan):** existing trips switched over: Show in Itinerary checked on their travel records and hand-made duplicates deleted.
4. Cleanup later: drop unused `itinerary_days.day_number` and `trips.departure_date`/`return_date` once 00.04.x has run on production.
5. Optional: Copy Trip date shifting (a copy keeps the source's itinerary dates).
6. Run Calendar Update All and verify the deleted `Arrive SEA` event is removed and the currently checked Itinerary record is recreated.
7. Activate the remaining intended Add to Google Calendar checkboxes, then verify complete event creation/deletion behavior.
8. Stan verifies all six 3×5 PDF categories and physical Epson output.
9. Work down the remaining 11 lint warnings.
10. **AI safeguards** (`docs/ai-safeguards-assessment-2026-10-26.md`): Stan deferred the top item (separate dev database) on 2026-10-26.
11. **Security review parked for later** — `/Users/developer/Projects/orb/docs/agent-security-review-2026-09-30.md` (agent exposure, Vercel Config vs Secret, Track A/B). §9 Stan-only quick wins; §11 pending decisions.

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-10-30 — Claude Code (Opus 5.5)
