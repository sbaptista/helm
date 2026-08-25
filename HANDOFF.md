# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0047`
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
| Printing | Packet + server-data 3×5 PDF modes with dashboard and travel-menu access | 00.02.0046 |
| Calendar | Google validation/relinking, truthful rebuilds, airport-correct flights, and complete hotel addresses | 00.02.0047 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized — ellipsis menu, status pills, force-dynamic + Help button + update banner | 00.02.0031 |
| Version System | Update banner + What's New sheet + changelog + /api/version | 00.02.0031 |

---

## Last Session Completed

**2026-08-24 — Printing repairs and hotel Calendar address completion (Codex GPT-5) — v00.02.0047**

1. Moved 3×5 reference-card data loading from direct browser Supabase queries into the existing authenticated `/advisor/trips/[id]/print` route.
2. Added `mode=cards&card=<type>` handling for flights, hotels, transportation, restaurants, Key Info, and daily itinerary cards.
3. Preserved Helm's validated `html2canvas` → `jsPDF` engine and Epson-tested `CardWrapper` margins instead of switching exact-size cards to native browser printing.
4. Added a route-level preparation screen plus card-by-card capture and PDF assembly progress, completion messaging, and retry/download-again controls.
5. Replaced the misleading “No card content generated to capture” alert with explicit server-query and empty-content states.
6. Fixed daily cards to load real itinerary days and filter itinerary rows by `day_id`; the Daily Itinerary option now prepares the complete set of day cards.
7. Corrected the print route's hotel ordering field from `checkin_date` to `check_in_date`.
8. Corrected both print layouts to use the canonical `flights.seat_number` field instead of the stale `seat_assignment` name, so saved seats no longer render as `TBD` or `-`.
9. Database impact: existing bounded read queries only; no schema, column, index, write pattern, or Realtime change.
10. Verification passed: `npx tsc --noEmit`, focused ESLint with zero errors/warnings, `git diff --check`, and six successful Next.js 16.2.5 production builds. Localhost browser/PDF, travel-menu interaction, Calendar resync, and Epson output remain for Stan to verify.
11. Renamed the Contacts card to Key Info, limited it to active `show_in_overview` records, and made it generate exactly one card.
12. Confirmed the two obsolete bag-dimension rows were already soft-deleted, then fixed the Overview and print queries to exclude deleted Key Info records so their stale links disappear.
13. Restored Print Trip to the travel-data sidebar APP group while retaining the dashboard trip-card action.
14. Reused the repaired `PrintExportModal` with only `tripId`; no print data was added back to the trip-detail page and no removed Edit/Delete/Clear actions were restored.
15. Mounted the modal outside the sidebar and kept the action in its scrollable area, avoiding the historical clipping/overflow and iOS fixed-footer failure modes.
16. Confirmed through the Google Calendar API that all ten included hotel check-in/check-out events exist in Canadian Rockies Adventure v3.
17. Expanded both hotel Calendar event Address lines to include street, city, province/state, and postal/ZIP code through one shared formatter.
18. Marked the five active Calendar-included hotels dirty so their ten existing Google events will receive the complete address on the next localhost Update All.
19. Hotel address database impact: one bounded five-row dirty-state update only; no new query pattern, table, column, index, recurring write frequency, or Realtime subscription.

---

## Uncommitted Changes

- `app/advisor/trips/[id]/print/page.tsx`, `app/advisor/trips/[id]/print/loading.tsx` — shared packet/card route, server-side card data, active Overview-only Key Info data, error handling, and preparation state.
- `components/advisor/PrintExportModal.tsx`, `components/advisor/DashboardView.tsx` — card selection now opens the authenticated print route instead of querying/capturing inside the modal.
- `components/advisor/TripDetailView.tsx`, `components/ui/TripSidebar.tsx` — the travel-data menu now opens the same print modal as the dashboard without duplicating print data loading.
- `components/advisor/print/CardPrintView.tsx` — server-rendered layouts for all six card categories, including a single Overview-only Key Info card, with correct daily filtering.
- `components/sections/OverviewSection.tsx` — excludes soft-deleted Key Info records from the Overview links.
- `lib/gcal/events.ts`, `types/sections.ts` — corrected the shared flight seat field type and made hotel Calendar descriptions use the complete stored address, including province and postal code.
- `components/advisor/print/CardPdfGenerator.tsx`, `lib/printing/printing-service.ts` — exact-size PDF generation with accessible card-by-card progress and retry controls.
- `docs/reference-card-print-route-plan.md` — approved design, database impact, and verification plan.
- `lib/version.ts`, `lib/changelog.ts`, `package.json`, `package-lock.json` — v00.02.0047 release documentation and metadata.
- `HANDOFF.md` — recorded the v00.02.0047 printing and hotel Calendar repair state.

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
- **One print data boundary**: Both 8.5×11 packets and 3×5 cards load data through the authenticated print route. Exact-size cards retain the validated `html2canvas` → `jsPDF` engine and Epson-tested margins.

---

## Next Priorities

1. Stan: verify all six 3×5 PDF categories on localhost and confirm physical Epson output preserves the established margins.
2. Audit and deliberately normalize timezone semantics for transportation, itinerary, and restaurant timestamps before enabling additional timed records for Google Calendar.
3. Resolve the pre-existing `UpdateBanner.tsx` lint error and remaining warning backlog.
4. Decide whether to replace the legacy unconditional proxy authentication bypass with the existing environment-scoped `BYPASS_AUTH_USER_ID` mechanism.
5. Add a Settings button and Passkeys management section in Helm (analogous to Orb's Settings -> Passkeys UI) to allow users to manage/register passkeys.

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-08-23 — Codex (GPT-5)
