# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.03.0000`
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
| Itinerary | Explicitly authored days and rows only; travel sections remain separate | 00.02.0055 |
| Printing | Packet + server-data 3×5 PDF modes; Daily cards use only explicit itinerary rows and show dates | 00.02.0055 |
| Calendar | Single full-duration Flight events, delete-on-uncheck, and accurate progress | 00.02.0050 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized; New Trip repaired; transactional Copy Trip added | 00.02.0054 |
| Version System | Update banner + What's New + dashboard, trip footer, and sidebar labels | 00.02.0051 |

---

## Last Session Completed

**2026-08-25 — Canadian Rockies final-document reconciliation and Overview consistency (Codex GPT-5) — v00.03.0000**

1. Confirmed that the New Trip button and client validation worked, but browser-side authentication was incompatible with Helm's configured localhost bypass.
2. Added an authenticated `POST /api/trips` route using the same real-auth/development-bypass contract as the dashboard.
3. Added server-side field/date validation, advisor-membership creation, and cleanup protection against orphan trips.
4. Made validation and request errors scroll into view in desktop and mobile creation forms.
5. Added Copy Trip to the dashboard ellipsis menu with editable destination and date fields and direct navigation to the copied Draft.
6. Added a service-only transactional copy function that remaps itinerary-day, hotel/nearby-dining, packing-group/subgroup, and Key Info group relationships.
7. Copied active user-facing content and memberships while resetting Google Calendar state and excluding operational history, documents, deleted rows, feedback, and notifications.
8. Database impact: one service-only function over existing tables; no new table, column, index, RLS policy, Realtime subscription, or recurring write path.
9. Stan applied the migration; a live dashboard copy created and opened `Canadian Rockies Adventure — Copy` (`b0fac6a1-fdf4-4999-ae51-2606ec85ab33`).
10. Live database checks confirmed matching active content counts, remapped relationships, preserved membership, Calendar resets, and zero copied operational-history rows. One source row named `fubar` was correctly excluded because its parent itinerary day was soft-deleted.
11. Removed automatic Flight, Hotel, Restaurant, and Transportation projections from Itinerary, Overview day counts, 8.5×11 printing, and 3×5 Daily cards while preserving the independent source sections and Calendar behavior.
12. Removed the obsolete projection utility, endpoint, and source-section refresh events.
13. Soft-deleted 43 itinerary rows and 11 itinerary days only from `Canadian Rockies Adventure v2` (`453c0c22-0010-46a7-9f5c-2eefda35e6cd`).
14. Verified the copy has zero active itinerary records; its Flights, Hotels, Transportation, Restaurants, Checklist, Packing, Key Info, and membership counts are unchanged.
15. Verified the original trip remains unchanged with 44 active itinerary rows and 11 active itinerary days. Database impact: one recoverable cleanup operation, no migration, schema/index change, Realtime subscription, or recurring write path.
16. Re-read and visually inspected the complete Rocky Mountaineer final document, then mapped its official October 4–13 Day 1–10 sequence with October 3 retained as Pretrip.
17. Populated `Canadian Rockies Adventure v2` with 11 explicit itinerary days and 24 document-derived items; unknown and arrival-dependent times remain TBD, arrival windows are retained in descriptions, and hotels/flights/restaurants are not duplicated.
18. Verified the day relationships, per-day counts (`0, 2, 1, 3, 3, 2, 4, 1, 4, 3, 1`), Calendar defaults, Overview timeline, and browser console.
19. Reconciled Hotels with the final document: corrected six existing records, added the missing Oct 11–12 Kamloops stay, fixed Kamloops dates and Elk/Sheraton postal data, and applied the document's complete room descriptions.
20. Cleared all hotel check-in/check-out times because the final document specifies dates only, removed the incorrect National Parks Pass date note, and retained useful non-conflicting hotel details.
21. Verified seven active stays, reset Calendar state, and all 26 unchanged nearby-dining records still reference valid copied hotels.
22. Reconciled Transportation with the final document by correcting five existing package transfers and adding five missing motorcoach records for the Vancouver and Kamloops station connections.
23. Corrected Jasper and Vancouver station origins, applied Brewster providers and exact 8:25 AM–6:00 PM / 12:20–1:30 PM schedules, and fixed the Banff pickup's 7:00–7:30 AM local-time window.
24. Retained the three useful personal airport/home arrangements, ordered all 13 records chronologically, flagged both hotel-lobby pickup times, and verified Calendar state remains reset.
25. Reconciled Key Info with the official booking, insurance, contacts, bedding preference, Guest Portal, and National Parks Pass details while preserving personal reference records.
26. Consolidated duplicate Rocky Mountaineer checklist tasks, corrected required check-in/document/pass/ID/luggage actions, and marked the received final documents complete.
27. Added a Train Day Bag packing category, retained personal ownership/packed state, and incorporated the established checked-bag and onboard-bag limits.
28. Verified all four retained Flights frame the official trip correctly, added three included dining records, and marked the Post Hotel Dining Room reservation confirmed.
29. Audited trip dates, timeline counts, hotel coverage, Flights, Transportation, Restaurants, Key Info, Checklist, Packing, Calendar defaults, and Overview on Mac-, iPad-, and iPhone-sized layouts with no overflow or console errors.
30. Fixed Overview UI/API queries to exclude soft-deleted Packing, Checklist, and Key Info records, and added dated deep-linked Hotel warnings for both unknown Kamloops properties.
31. Database impact: reconciliation used ordinary writes to existing tables; the Overview fix adds no schema, index, RLS, Realtime, or recurring-write change.

---

## Uncommitted Changes

- `app/api/trips/route.ts`, `components/advisor/CreateTripModal.tsx` — server-authenticated trip creation and visible validation/request errors (v00.02.0053).
- `app/api/trips/[id]/copy/route.ts`, `supabase/migrations/202608250001_copy_trip.sql` — advisor-authorized transactional trip copy with relationship remapping and Calendar resets.
- `components/advisor/{CopyTripModal,DashboardView,TripCard,TripCardMenu}.tsx` — responsive Copy Trip form, menu action, and navigation to the new Draft.
- `docs/create-trip-fix-plan.md` — approved design, live-schema findings, database impact, and verification plan.
- `docs/copy-trip-plan.md` — approved copy scope, exclusions, architecture, database impact, and verification plan.
- `components/sections/{ItinerarySection,ItineraryClient,OverviewSection,FlightsClient,HotelsClient,RestaurantsClient,TransportationClient}.tsx`, `components/advisor/print/CardPrintView.tsx`, `app/advisor/trips/[id]/print/page.tsx` — removed linked travel-section projections and obsolete refresh events.
- `components/trips/overview/OverviewClient.tsx`, `app/advisor/trips/[id]/page.tsx`, `app/api/trips/[id]/overview/route.ts`, `components/sections/OverviewSection.tsx` — active-record Overview counts and dated Hotel attention items.
- Deleted `app/api/trips/[id]/itinerary/linked/route.ts` and `lib/itinerary/linked-entries.ts` — removed the projection API and utility.
- `docs/linked-itinerary-projection-plan.md`, `docs/separate-itinerary-plan.md` — marked the former behavior superseded and recorded the approved separation and live cleanup.
- `WIP.md` — completed Itinerary separation and live-verification checkpoint, retained until the final handoff is staged.
- `lib/version.ts`, `lib/changelog.ts`, `package.json`, `package-lock.json`, `HANDOFF.md` — v00.02.0053–0055 and v00.03.0000 release documentation and handoff.

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

1. Stan verifies Overview shows 85 active Packing items and two dated Kamloops Hotel warnings that open the correct Hotel records.
2. Stan verifies all six 3×5 PDF categories on localhost and confirms physical Epson output preserves the established margins.
3. Test explicit Itinerary rows, daily cards, and All Day/Estimated behavior on Mac, iPad, and iPhone.
4. Run Calendar Update All and verify each included Flight has one full-duration event, the temporary arrival events are removed, Hotels have two 30-minute events, and unchecking removes stored events.
5. Resolve the pre-existing `UpdateBanner.tsx` lint error and remaining warning backlog.

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-08-25 — Codex (GPT-5)
