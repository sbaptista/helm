# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.03.0006`
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
| Itinerary | Explicit rows; shared-city zones, Time TBD, cross-zone ranges, Calendar indicator | 00.03.0006 |
| Printing | Packet + server-data 3×5 PDF modes; Daily cards show dates and cross-zone time ranges | 00.03.0001 |
| Calendar | Secondary-calendar clearing, rebuild queue, and deleted-event cleanup | 00.03.0003 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized; New Trip repaired; transactional Copy Trip added | 00.02.0054 |
| Version System | Update banner + What's New + dashboard, trip footer, and sidebar labels | 00.02.0051 |

---

## Last Session Completed

**2026-08-26 — Itinerary timezone display and Calendar lifecycle repair (Codex GPT-5) — v00.03.0001–00.03.0006**

1. Added Seattle (`America/Los_Angeles`) to the Itinerary start and end timezone selectors.
2. Added one shared formatter that keeps same-zone ranges compact and shows both date-correct abbreviations for cross-zone or daylight-saving transitions.
3. Updated Daily Itinerary 3×5 cards to include end times and end timezones.
4. Verified the live HNL→SEA entry as `11:30 PM HST – 8:13 AM PDT` on the Itinerary page and Daily 3×5 card.
5. Repaired Clear Calendar for Helm's dedicated secondary Google calendars by listing and deleting every event while preserving the calendar.
6. Added visible clear errors, a busy state, and duplicate-submit protection to the Calendar modal.
7. Preserved Add to Google Calendar selections, cleared obsolete event IDs, marked every included active record dirty, and left excluded records clean after a successful clear.
8. Stan completed the live clear successfully. Database verification found one checked Itinerary row still included and dirty with no event ID; every excluded active row remained clean and all stored event IDs were null.
9. TypeScript, focused lint, production builds, Daily 3×5 PDF preparation, `git diff --check`, and browser-console checks passed.
10. Database impact: existing bounded reset writes only; no schema, index, RLS, Realtime, or new query-pattern change.
11. Made deleted calendar-linked records remain visible to Calendar status and Update All as pending-deletion tombstones across all six sections.
12. Made itinerary-day deletion queue every linked child row, and corrected dirty-state handling for Itinerary edits and Checklist exclusion.
13. Marked the already deleted `Arrive SEA` row dirty and excluded while retaining its event ID, so the next Update All will remove the orphan Google event.
14. Database impact for deleted-event cleanup: the existing trip-scoped `gcal_dirty` reads now include soft-deleted tombstones; no schema, index, RLS, Realtime, or high-frequency-write change.
15. Made Clear Calendar reset event IDs on active and deleted records before queuing only included active records for rebuilding.
16. Restored the archived `Canadian Rockies Adventure` itinerary from the exact soft-deleted copy snapshot: 11 days and 43 rows. The active v2 itinerary remained at 11 days and 26 rows.
17. Consolidated duplicate city options that share one IANA timezone into `Vancouver / Kamloops` and `Jasper / Lake Louise / Banff`, preventing native selects from reverting to the first duplicate label.
18. Added an accessible gold Calendar Check icon to every Itinerary row with `gcal_include = true`; unchecking and saving removes it after the existing refetch.
19. Added explicit Time TBD form behavior using the existing `day_id` plus null timestamps, including automatic recognition of current untimed rows and clear attached-day messaging.
20. Disabled incomplete timestamp, estimated-time, and Calendar states for TBD rows; updated full-size printing to distinguish Time TBD from All Day. Daily 3×5 and the Itinerary page already use the shared Time TBD formatter.
21. Repaired new Itinerary-row Calendar inclusion persistence and moved the active untimed Jasper Skytram record from Oct 9 to Oct 8. No reference entries were restored.
22. Database impact: one bounded `day_id` repair only; no schema, index, RLS, Realtime, or new query-pattern change.

---

## Uncommitted Changes

- None. The v00.03.0001–00.03.0006 changes are included in the local commit prepared on 2026-08-29.

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

1. Stan continues recreating the Itinerary and reports issues as encountered.
2. Run Calendar Update All and verify the deleted `Arrive SEA` event is removed and the currently checked Itinerary record is recreated.
3. Activate the remaining intended Add to Google Calendar checkboxes, then verify complete event creation/deletion behavior.
4. Stan verifies all six 3×5 PDF categories and physical Epson output.
5. Resolve the pre-existing `UpdateBanner.tsx` lint error and remaining warning backlog.

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-08-26 — Codex (GPT-5)
