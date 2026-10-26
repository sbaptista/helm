# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.04.0003`, committed locally 2026-10-25 for release (push to review + `helm-release` by Stan). Previous production: `00.03.0018` (2026-10-22, `ac5402c`)
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
| Transportation | Functional + WARN system + source-owned itinerary timing metadata | 00.02.0048 |
| Hotels | Functional + WARN system + source-owned check-in/check-out itinerary timing | 00.02.0048 |
| Flights | Functional + local endpoint timing + source-owned departure/arrival itinerary timing | 00.02.0048 |
| Restaurants | Functional + WARN system + source-owned reservation itinerary timing | 00.02.0048 |
| Itinerary | Days identified by date only (no day numbers); one day per date; no trip-range limits on dates; defines the trip's dates | 00.04.0003 |
| Printing | Packet + server-data 3×5 PDF modes; day headings by date; packet trip range from itinerary (local-date fix) | 00.04.0002 |
| Calendar | Secondary-calendar clearing, rebuild queue, deleted-event cleanup; Itinerary all-day events dated from their day | 00.03.0011 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized; Done status + filter; no trip date entry (dates from itinerary, "No dates set" placeholders) | 00.04.0003 |
| Version System | Update banner + What's New + dashboard, trip footer, and sidebar labels | 00.02.0051 |

---

## Last Session Completed

**2026-10-24 → 2026-10-25 — Claude Code (Opus 5.5) — v00.04.0000–0003**, changes from Stan's first real trip. Each change has a plan doc in `docs/`; Stan tested them all on localhost before release.

1. **00.04.0000 — Done status** (`docs/trip-completed-status-plan.md`). New `done` status (first named Completed; renamed to fit the pill size). `TRIP_STATUSES` in `types/trips.ts` is the single list; `Badge.tsx` imports the type. Dashboard badge, menu pill, filter; Overview "Trip done" banner. `PATCH /api/trips/[id]` rejects unknown statuses, the only guard: `trips.status` is unconstrained `text` (schema checked by Stan). Finding: **Archive hard-deletes all section data with no confirmation and leaves Google Calendar events behind**; Stan chose to keep it that way.
2. **00.04.0001 — date-only itinerary** (`docs/itinerary-date-only-plan.md`). Fixed "Day null" on hand-added days (only the import set `day_number`). Stan decided to drop day numbering: day headings, Overview timeline, packet and 3×5 cards use dates; ordering is `day_date`, then `sort_order`; Pre-Trip label gone; `card=day-N` removed. The import keeps `day_number` only as an extraction link key and maps days by `sort_order`. Column `itinerary_days.day_number` kept, unused.
3. **00.04.0002 — Overview timing tile, one day per date** (`docs/overview-trip-timing-plan.md`). `lib/itinerary-days.ts` `findDayDateClash` (409 on add, or on a date change). Migration `202610250001_copy_trip_optional_dates.sql` (copy_trip accepts no dates and one-day trips) **applied and verified by Stan 2026-10-25**. Fixed: packet trip dates parsed as UTC (a day early in Hawaii).
4. **00.04.0003 — trip dates come from the itinerary** (`docs/itinerary-driven-trip-dates-plan.md`; supersedes 0002's optional Start/End fields). `lib/trip-range.ts` derives start/end from active `itinerary_days`; `Trip.start_date`/`end_date`. No date fields in New/Copy/Edit; APIs no longer accept dates; `trips.departure_date`/`return_date` unused. Dashboard reads days with the service client (limited to the user's advised trips; signed-in RLS on `itinerary_days` unverified). Itinerary day/item saves and deletes call `router.refresh()`; trip page is `force-dynamic`. Tile label matches the Trip Timeline row ("Next: Mon, Oct 26 · Fun in the Sun"), and that row is outlined and tagged.
5. Change log for Knowledge: `scratch/v00.04.0000-changes.md`; drafts: `scratch/knowledge-drafts-2026-10-25.md` (both untracked).

---

## Uncommitted Changes

- None in Helm except untracked `scratch/` (change log and Knowledge drafts).
- Orb repo: `docs/agent-security-review-2026-09-30.md` (modified 2026-10-23, uncommitted in Orb). **Deferred by Stan (2026-10-24):** leave it uncommitted for now; commit it from an Orb session later.

---

## Knowledge Entries Due at Completion

⏳ **Four drafts for v00.04.0000–0003, not yet saved:** `scratch/knowledge-drafts-2026-10-25.md`. Stan runs the listed Copy Results searches first so older entries can be superseded, then saves and confirms. Agents can't verify Orb in manual mode.

1. **Trip lifecycle adds Done; Archive deletes data.**
2. **Itinerary days are identified by date, not number.**
3. **Trip dates come from the itinerary; trips can be undated placeholders.**
4. **Overview timing tile and one itinerary day per date.**

Earlier entries (2026-10-23/24, nine) were all saved by Stan.

---

## Key Decisions

- **Dashboard is CRUD hub**: All trip management happens on the dashboard. Trip detail view is read-only + import + calendar.
- **Trip status lifecycle**: Draft → Upcoming → Active → Done → Archived. Upcoming = confirmed but not yet traveling. Done = over, all data kept. Archive deletes section data (no confirmation, by choice).
- **Itinerary is the source of trip dates**: a trip's start/end are its first/last active itinerary day (`lib/trip-range.ts`), never stored. A trip with no days shows "No dates set". `trips.departure_date`/`return_date` are legacy and unused.
- **A day is its date**: no day numbers; one itinerary day per date per trip; order by `day_date`, then `sort_order`.
- **force-dynamic on mutation pages**: Any page where client actions mutate data and calls `router.refresh()` must export `const dynamic = 'force-dynamic'`.
- **Version bump = production push**: Every version change ships. No version exists only in dev.
- **Auth shell variant system**: Variant A (navy + stars + wheel) is default. Variant B preserved via DEV toggle.
- **Service worker**: network-first for navigation, cache-first for static assets. Disabled in development.
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

1. **Release v00.04.0003**: Stan runs `git -C /Users/developer/Projects/helm push review main` as `developer`, then `/usr/local/helm-bin/helm-release` as admin. Then check iPad and iPhone on production (also pending from the encryption plan).
2. **Knowledge**: run the four Copy Results searches in `scratch/knowledge-drafts-2026-10-25.md`, save the entries, confirm.
3. Stan's next batch of trip-driven changes (in progress).
4. Cleanup later: drop unused `itinerary_days.day_number` and `trips.departure_date`/`return_date` once 00.04.x has run on production.
5. Optional: Copy Trip date shifting (a copy keeps the source's itinerary dates).
6. Run Calendar Update All and verify the deleted `Arrive SEA` event is removed and the currently checked Itinerary record is recreated.
7. Activate the remaining intended Add to Google Calendar checkboxes, then verify complete event creation/deletion behavior.
8. Stan verifies all six 3×5 PDF categories and physical Epson output.
9. Work down the remaining 11 lint warnings.
10. **Security review parked for later** — `/Users/developer/Projects/orb/docs/agent-security-review-2026-09-30.md` (agent exposure, Vercel Config vs Secret, Track A/B). §9 Stan-only quick wins; §11 pending decisions.

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-10-25 — Claude Code (Opus 5.5)
