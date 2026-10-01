# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.03.0012`
- **Branch:** main
- **Dev server:** user-started on localhost:3000
- **Live URL:** https://helm-gilt.vercel.app

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | Active-record counts + Checklist/Itinerary/Hotel attention aggregation | 00.03.0000 |
| Checklist | Functional + WARN system + required validation + scroll-to-error | 00.02.0026 |
| Packing | Functional — checkboxes rebuilt as native inputs | 00.01.0157 |
| Key Info | Functional + required validation | 00.02.0014 |
| Transportation | Functional + WARN system + source-owned itinerary timing metadata | 00.02.0048 |
| Hotels | Functional + WARN system + source-owned check-in/check-out itinerary timing | 00.02.0048 |
| Flights | Functional + local endpoint timing + source-owned departure/arrival itinerary timing | 00.02.0048 |
| Restaurants | Functional + WARN system + source-owned reservation itinerary timing | 00.02.0048 |
| Itinerary | Explicit rows; shared-city zones, Time TBD, cross-zone ranges, Calendar indicator; All Day/Time TBD calendar opt-in | 00.03.0011 |
| Printing | Packet + server-data 3×5 PDF modes; Hotel phone and city included | 00.03.0009 |
| Calendar | Secondary-calendar clearing, rebuild queue, deleted-event cleanup; Itinerary all-day events dated from their day | 00.03.0011 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized; New Trip repaired; transactional Copy Trip added | 00.02.0054 |
| Version System | Update banner + What's New + dashboard, trip footer, and sidebar labels | 00.02.0051 |

---

## Last Session Completed

**2026-09-30 — All Day/Time TBD calendar opt-in + UpdateBanner lint fix (Claude Code, Opus 5.5) — v00.03.0011–00.03.0012**

1. Itinerary All Day and Time TBD items can now be added to Google Calendar via the existing Add to Google Calendar checkbox (opt-in only; toggling All Day or Time TBD still clears the tick). The form shows which day the all-day event will land on.
2. POST `/api/trips/[id]/itinerary/rows` keeps `gcal_include` when the row has a `start_time` or a `day_id`.
3. Calendar push resolves `itinerary_days.day_date` for dirty Itinerary rows (one `IN` lookup per Update All) and `buildItineraryEvent` emits an all-day event on that date; Time TBD events get `· Time TBD` appended to the title.
4. Fixed a latent bug: all-day Itinerary events previously derived their date from `start_time`, which is always null for All Day rows.
5. UpdateBanner: callback ref now updated in an effect (resolves `react-hooks/refs` error); version-check effect declares `checkVersion`, which depends only on the stable `toast.neutral`. One `set-state-in-effect` warning remains (intentional mount-time check). Project lint: 0 errors, 11 warnings.
6. Database impact: no schema change; one extra primary-key lookup per Itinerary calendar push.
7. Stan tested on localhost and pushed; production verified at `00.03.0012` (`dcf2f1a`).
8. Prepared Knowledge entries (All Day/Time TBD calendar opt-in; UpdateBanner ref/useToast pattern); Stan saved both in Orb.
9. Aligned Helm `AGENTS.md` with shared Manual Data-Transfer Mode: removed service-role Knowledge Repo queries and the Orb API backlog curl, pointed agents to Copy/Copy Results, and noted the Itinerary All Day/Time TBD `gcal_include` exception. Docs-only, no version bump; pushed as `7562cc0`.

---

## Uncommitted Changes

- None besides this HANDOFF.md update. All session work is pushed (`origin/main` at `7562cc0`).

---

## Key Decisions

- **Dashboard is CRUD hub**: All trip management happens on the dashboard. Trip detail view is read-only + import + calendar.
- **Trip status lifecycle**: Draft → Upcoming → Active → Archived. Upcoming = confirmed but not yet traveling.
- **force-dynamic on mutation pages**: Any page where client actions mutate data and calls `router.refresh()` must export `const dynamic = 'force-dynamic'`.
- **Version bump = production push**: Every version change ships. No version exists only in dev.
- **Auth shell variant system**: Variant A (navy + stars + wheel) is default. Variant B preserved via DEV toggle.
- **Service worker**: network-first for navigation, cache-first for static assets. Disabled in development.
- **Dev bypass**: server-side `BYPASS_AUTH_USER_ID` + login form `dev@dev.local`. Both disappear in production.
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

1. Stan searches Knowledge for related entries ("all day", "Time TBD", "gcal_include", "UpdateBanner") and supersedes any older entry saying All Day/Time TBD items cannot sync to the calendar.
2. Stan continues recreating the Itinerary and reports issues as encountered.
3. Run Calendar Update All and verify the deleted `Arrive SEA` event is removed and the currently checked Itinerary record is recreated.
4. Activate the remaining intended Add to Google Calendar checkboxes, then verify complete event creation/deletion behavior.
5. Stan verifies all six 3×5 PDF categories and physical Epson output.
6. Work down the remaining 11 lint warnings.

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-09-30 — Claude Code (Opus 5.5)
