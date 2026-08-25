# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0051`
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
| Transportation | Functional + WARN system + source-owned itinerary timing metadata | 00.02.0048 |
| Hotels | Functional + WARN system + source-owned check-in/check-out itinerary timing | 00.02.0048 |
| Flights | Functional + local endpoint timing + source-owned departure/arrival itinerary timing | 00.02.0048 |
| Restaurants | Functional + WARN system + source-owned reservation itinerary timing | 00.02.0048 |
| Itinerary | Manual rows plus automatic read-only linked source projections | 00.02.0048 |
| Printing | Packet + server-data 3×5 PDF modes with dashboard and travel-menu access | 00.02.0046 |
| Calendar | Single full-duration Flight events, delete-on-uncheck, and accurate progress | 00.02.0050 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized — ellipsis menu, status pills, force-dynamic + Help button + update banner | 00.02.0031 |
| Version System | Update banner + What's New + dashboard, trip footer, and sidebar labels | 00.02.0051 |

---

## Last Session Completed

**2026-08-24 — Automatic linked itinerary projection and Calendar lifecycle repair (Codex GPT-5) — v00.02.0051**

1. Added read-time itinerary projections for Flight departure/arrival, Hotel check-in/check-out, Restaurant reservations, and Transportation pickups without creating duplicate `itinerary_rows`.
2. Made linked entries view-only in Itinerary and deep-link them to the owning source record for every CUD action.
3. Added independent All Day and Estimated flags for each source occurrence with touch-sized controls and All Day/Estimated mutual behavior.
4. Assigned Flight occurrences using their endpoint-local timezone dates; Hotels use their local date fields; Restaurant and Transportation preserve Helm's stored wall-clock convention with their source timezone.
5. Added bounded linked-entry refresh after source mutations and on focus/visibility, with no `postgres_changes` subscription or continuous WAL load.
6. Included linked entries in Overview day counts, the packet itinerary, and daily 3×5 cards without duplicating them in Search.
7. Split the former Flight Google event ID into departure and arrival IDs. Departure spans the actual flight and Arrival is a 30-minute marker.
8. Changed Hotel check-in/check-out and Restaurant Calendar events to 30 minutes while retaining Transportation's source duration or one-hour fallback.
9. Fixed Calendar uncheck semantics: unchecked records remain dirty until Update All deletes their remote events and clears their stored IDs.
10. Made Calendar status count pending deletions, made operation totals account for two-event records, and added live activity text while Calendar work is waiting or running.
11. Added `supabase/migrations/202608240001_linked_itinerary_projection.sql`; no new table, RLS policy, index pattern, high-frequency write, or Realtime subscription is introduced.
12. Existing manual itinerary duplicates were intentionally left untouched for Stan to remove.
13. Verification passed: `npx tsc --noEmit`, focused ESLint with zero errors/warnings, `git diff --check`, and a successful Next.js 16.2.5 production build.
14. Stan applied the migration successfully. REST verification confirmed all new columns are live and the four included trip Flights preserved their former event IDs as departure IDs, have null arrival IDs, and are dirty for the next Update All.
15. Expanded Flight arrival Calendar titles into one responsive comma-separated summary containing flight/carrier check-in information and airport-local departure/arrival details.
16. Marked all four included Flights dirty so their existing arrival events receive the new titles on the next Update All.
17. Corrected the Flight Calendar design to one event per Flight spanning departure through arrival, while retaining two read-only Flight entries in Helm Itinerary.
18. Added a cleanup migration and sync path that preserves the canonical Flight event ID, deletes the four temporary arrival events on Update All, and then clears their legacy IDs.
19. Stan applied the single-event migration successfully. REST verification confirmed all four canonical IDs and temporary arrival IDs were preserved and all Flights are dirty for cleanup.
20. Added the current Helm version beneath the trip name/date in the sidebar while retaining the dashboard and trip-footer version labels.

---

## Uncommitted Changes

- `supabase/migrations/202608240001_linked_itinerary_projection.sql`, `202608240002_single_flight_calendar_event.sql` — source timing flags, canonical single Flight ID, and temporary arrival-event cleanup state.
- `lib/itinerary/linked-entries.ts`, `app/api/trips/[id]/itinerary/linked/route.ts` — shared source projection and bounded authenticated refresh endpoint.
- `components/sections/{Flights,Hotels,Restaurants,Transportation,Itinerary,Overview}*.tsx` — source timing controls, linked read-only rows, deep links, and counts.
- `components/advisor/TripDetailView.tsx`, `components/advisor/print/CardPrintView.tsx`, `app/advisor/trips/[id]/print/page.tsx` — source-record navigation and linked packet/card content.
- `lib/gcal/events.ts`, `lib/gcal/sync-state.ts`, `app/api/gcal/**` — single Flight events, temporary arrival cleanup, 30-minute Hotel/Restaurant markers, delete-on-uncheck, status, and progress.
- Source PATCH/POST routes and `types/sections.ts` — new fields and dirty-state lifecycle.
- `docs/linked-itinerary-projection-plan.md` — approved design and database impact.
- `lib/version.ts`, `lib/changelog.ts`, `package.json`, `package-lock.json`, `HANDOFF.md` — v00.02.0051 release documentation and handoff.

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
- **Clear means rebuild**: Clear Calendar deletes Google events, removes obsolete event IDs, and marks every included record dirty for the next Update All.
- **One print data boundary**: Both 8.5×11 packets and 3×5 cards load data through the authenticated print route. Exact-size cards retain the validated `html2canvas` → `jsPDF` engine and Epson-tested margins.

---

## Next Priorities

1. Stan: verify all six 3×5 PDF categories on localhost and confirm physical Epson output preserves the established margins.
2. Test linked Itinerary rows, source deep links, Overview counts, daily cards, and All Day/Estimated behavior on Mac, iPad, and iPhone.
3. Run Calendar Update All and verify each included Flight has one full-duration event, the temporary arrival events are removed, Hotels have two 30-minute events, and unchecking removes stored events.
4. Resolve the pre-existing `UpdateBanner.tsx` lint error and remaining warning backlog.

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-08-24 — Codex (GPT-5)
