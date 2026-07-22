# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0043`
- **Branch:** main
- **Dev server:** user-started on localhost:3000
- **Live URL:** https://helm-gilt.vercel.app

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | Functional — section title restored | 00.02.0000 |
| Checklist | Functional + WARN system + required validation + scroll-to-error | 00.02.0026 |
| Packing | Functional — checkboxes rebuilt as native inputs | 00.01.0157 |
| Key Info | Functional + required validation | 00.02.0014 |
| Transportation | Functional + WARN system + action_note + required validation + scroll-to-error | 00.02.0026 |
| Hotels | Functional + WARN system + action_note + required validation + scroll-to-error | 00.02.0026 |
| Flights | Parity build complete + WARN system + required validation + inline timing errors + scroll-to-error | 00.02.0026 |
| Restaurants | Full redesign complete + WARN system + required validation + scroll-to-error | 00.02.0026 |
| Itinerary | Parity declared complete + WARN system + required validation + scroll-to-error + server-side validation | 00.02.0026 |
| Printing | 3x5 cards — triggered from dashboard menu | 00.02.0022 |
| Calendar | Google validation/relinking, truthful full rebuilds, and airport-correct flight times | 00.02.0043 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized — ellipsis menu, status pills, force-dynamic + Help button + update banner | 00.02.0031 |
| Version System | Update banner + What's New sheet + changelog + /api/version | 00.02.0031 |

---

## Last Session Completed

**2026-07-21 — HELM-70 calendar integrity and flight timezone repair (Codex GPT-5) — v00.02.0043**

1. Migrated the deprecated Next.js middleware convention to `proxy.ts` / `proxy()` and pinned Next.js plus ESLint configuration to 16.2.5.
2. Proved that Helm was trusting a stale `trips.gcal_calendar_id` after its Google calendar was deleted, swallowing per-event failures, falsely stamping `gcal_last_synced_at`, and rendering every streamed operation as successful.
3. Added authoritative Google calendar validation on modal open and before sync. A missing calendar now presents an explicit recovery state with selection from writable Google calendars or creation of a replacement. Relinking clears obsolete event IDs and queues only Calendar-included records for a complete rebuild.
4. Standardized sync eligibility across status and Update All: both `gcal_include = true` and `gcal_dirty = true` are required. Excluded records never enter the update queue.
5. Made sync results truthful end to end. Per-operation failures are carried through SSE, rendered as errors, logged structurally, and leave rows dirty. Hotels and checklist rows clear dirty state only after all required operations and database writes succeed. `gcal_last_synced_at` is written only after a completely successful run.
6. Fixed Clear Calendar so it clears obsolete event IDs and queues all included records for rebuilding. Stan verified a full rebuild of 4 flights, 1 hotel, 1 transportation record, 1 itinerary record, and 3 checklist records.
7. Fixed the progress-modal hang observed after that successful rebuild. SSE framing now resists CRLF/chunk boundaries, disables intermediary buffering, has a 30-second inactivity bound, and confirms completion against authoritative server status. The completed run ended with `dirtyCount: 0` and all included records holding Google event IDs.
8. Corrected the flight timezone model. Helm flight details always show departure and arrival in their respective airport-local timezones; storage and Google use real UTC instants derived from local clock time plus IANA timezone; Google then renders those instants in the viewer's active timezone. AS 900 now represents Oct 3 11:30 PM HST departure and Oct 4 8:13 AM PDT arrival (5:13 AM HST when viewed in Hawaii).
9. Corrected all four Canadian Rockies flight timestamps in the database, marked them dirty, and verified their Google updates. Future manual flight saves and document imports now perform the same conversion, cross-timezone validation compares real instants, and DST abbreviations are calculated for the flight date.
10. Audited transportation, restaurants, and itinerary for the same legacy local-time-as-UTC pattern. No unrelated records were reinterpreted because their intended location/timezone was not certain; the audit result is captured in HELM-70's Knowledge Repository entry.
11. Verification passed: deterministic timezone examples, `npx tsc --noEmit`, focused ESLint with zero errors/warnings in changed files, three production builds, live missing-calendar detection, live full-rebuild state, and Stan's browser/Google Calendar confirmation. No schema, table, column, index, or Realtime change was required.
12. UI model: reused the existing `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter`, and `Button` patterns; no new global CSS pattern was introduced.
13. Closed HELM-70 with complete resolution notes. Shared Knowledge Repository entry: `1b08eb32-0043-4a96-bc4e-812f29cd7a4e`.

---

## Uncommitted Changes

- `AGENTS.md` — removed the obsolete changelog warning.
- `HANDOFF.md` — recorded the complete v00.02.0043 session and verification.
- `middleware.ts` → `proxy.ts` — adopted the Next.js 16 proxy convention with unchanged behavior.
- `package.json`, `package-lock.json` — v0.2.43 metadata and pinned Next.js/ESLint 16.2.5.
- `lib/version.ts`, `lib/changelog.ts` — v00.02.0043 release documentation.
- `docs/helm-70-calendar-repair-plan.md` — approved failure analysis, repair contract, database impact, and timezone model.
- `lib/gcal/client.ts`, `lib/gcal/push.ts`, `lib/gcal/events.ts` — structured Google errors, missing-event recreation, and fixed-instant flight events.
- `lib/gcal/sync-state.ts`, `lib/zoned-time.ts` — writable-calendar discovery/relink reset and IANA-zone instant conversion/formatting.
- `app/api/gcal/status/[tripId]/route.ts`, `app/api/gcal/calendar/route.ts`, `app/api/gcal/calendar/clear/route.ts`, `app/api/gcal/push/trip/[tripId]/route.ts`, `app/api/gcal/push/_shared/pushSection.ts` — validation, relinking, full rebuilds, honest success/failure, and robust streaming.
- `app/api/flights/[id]/route.ts`, `app/api/trips/[id]/flights/route.ts`, `app/api/trips/import/confirm/route.ts` — airport-timezone conversion for flight edits, creates, and imports.
- `components/advisor/CalendarModal.tsx`, `components/advisor/TripDetailView.tsx`, `components/ui/TripTopBar.tsx`, `components/ui/TripSidebar.tsx` — missing-calendar recovery and truthful status/progress UI.
- `components/sections/FlightsClient.tsx` — airport-local detail/form rendering and instant-aware validation.

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
- **Calendar eligibility**: a record requires Update All only when both `gcal_include` and `gcal_dirty` are true.
- **Calendar authority**: a stored Google calendar ID is only a pointer; Google CalendarList validation determines whether the calendar still exists and is accessible.
- **Flight time contract**: Helm displays airport-local time with its date-correct timezone abbreviation. Persist and sync the real instant computed from local date/time plus IANA timezone; calendar applications render that instant in the viewer's active timezone.
- **Clear means rebuild**: Clear Calendar deletes Google events, removes obsolete event IDs, and marks every included record dirty for the next Update All.

---

## Next Priorities

1. Audit and deliberately normalize timezone semantics for transportation, itinerary, and restaurant timestamps before enabling additional timed records for Google Calendar.
2. Resolve the pre-existing `UpdateBanner.tsx` lint error and remaining warning backlog.
3. Decide whether to replace the legacy unconditional proxy authentication bypass with the existing environment-scoped `BYPASS_AUTH_USER_ID` mechanism.
4. Add a Settings button and Passkeys management section in Helm (analogous to Orb's Settings -> Passkeys UI) to allow users to manage/register passkeys.

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-07-21 — Codex (GPT-5)
