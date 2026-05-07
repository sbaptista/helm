# Helm Handoff — Apr 25a

## INCLUDE THIS SECTION WITH ALL HANDOFFS

My name is Stan. Read this file completely. When you are done answer the following questions:

1. Describe the project you and I are going to work on.
2. Explain versioning and what needs to be updated for a new release.
3. Explain the versioned file name format.
4. What are the working rules?
5. What is the most important rule?
6. Describe the use of AI and the typical workflow.
7. What is our next task(s)?

## Working Rules
0. **Never build without Stan's explicit go-ahead.**
1. **Plan first. Wait for confirmation. Then build.**
2. **Never propose a plan and immediately build in the same response.**
3. **Stan sets the pace.**
4. **Schema-first.** Query `information_schema.columns` before writing any insert code.
5. **Every git push gets a version bump — no exceptions.**
6. **Handoff is generated silently via present_files. No narration.**
7. **Localhost-first development.** All implementation and testing is done on `localhost:3000`. Version bumps happen continuously as changes are made — they reflect that the local version is ahead of production. Git pushes happen only when Stan decides enough changes have accumulated to warrant a release.
8. **Every new form field gets a deliberate label and placeholder text at build time — not deferred.**

## AI Roles
1. **AI1:** Architect / Designer / Planner / Handoff Maintainer (e.g., Claude, Perplexity)
2. **AI2:** Code Implementer (e.g., Cursor, Claude Code — currently Opus 4.6)

## Workflow
1. AI1 collaborates with Stan to make project decisions, including software architecture and design.
2. AI1 proposes solutions that Stan must approve.
3. Upon approval, AI1 generates implementation instructions for AI2.
4. AI2 implements the instructions and generates results, which Stan copies and returns to AI1.

**Notes:**
- AI1 provides SQL instructions to Stan, who runs them in Supabase and returns the results.
- AI1 maintains a log of session activity.
- AI1 generates a handoff file periodically at Stan's request using the logged activity.

**Important:**
- AI1 and AI2 can be performed by one AI. When a session starts, the AI asks Stan for roles.
- Stan controls the pace entirely.
- Stan uses localhost:3000 for testing. Git push only at agreed milestones.

---

## Project
**Helm** — personal trip companion web app (Next.js App Router, Supabase, Vercel, TypeScript, Tailwind v4).
Replacing CAN26 for October 2026 Canadian Rockies / Rocky Mountaineer trip.

**GitHub:** `sbaptista/helm`
**Live:** `helm-gilt.vercel.app`
**Version file:** `lib/version.ts` — format `MM.mm.nnnn`
**Supabase client import path:** `@/lib/supabase/client`

---

## Current Version
`00.01.0164` — local only, not yet pushed to production

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | ✅ Functional — section title missing (Issue #18) | 00.01.0081 |
| Checklist | ✅ Functional + WARN system | 00.01.0141 |
| Packing | ✅ Functional — checkboxes rebuilt as native inputs | 00.01.0157 |
| Key Info | ✅ Functional (Gold Standard CRUD) | 00.01.0054 |
| Transportation | ✅ Functional + WARN system + action_note | 00.01.0147 |
| Hotels | ✅ Functional + WARN system + action_note | 00.01.0141 |
| Flights | ✅ Parity build complete + WARN system + validation guards | 00.01.0141 |
| Restaurants | ✅ Full redesign complete + WARN system | 00.01.0147 |
| Itinerary | ✅ Parity declared complete + WARN system | 00.01.0147 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |
| Calendar | ✅ gcal_include opt-in architecture complete. Refactored into CalendarModal + thin CalendarButton. Triggered from 📅 icon in TripTopBar and sidebar APP group. | 00.01.0159 |
| Logs | ✅ Complete — Phase 1–4 done. Triggered from sidebar APP group. Back button removed. | 00.01.0156 |
| Search | ⚠️ Page exists but functionality is gone — broken during navigation redesign (Issue #19) | 00.01.0154 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate internally | Future enhancement |
| 4 | Itinerary row typography | Further refinement possible. Stan happy with current state. | Future / optional |
| 5 | Mobile — text size | Body text readable but Stan would prefer larger. Deferred. | Future |
| 6 | iPad magic link | OTP / magic link investigation set aside. Auth bypass in place instead. | Set aside |
| 7 | Offline UX | Detect offline state, show banner, hide Edit/Save/Delete controls. | Deferred |
| 8 | Existing sections | Retrofit descriptive labels and placeholders across all existing section forms. | Deferred |
| 9 | Tooltips | Mac/hoverable tooltip pass across all sections. Deferred post-labels retrofit. | Deferred |
| 10 | Trip header actions | Import Document — confirm whether still active or can be removed. | Future |
| 12 | gcal_include checkbox | Size consistency across all 6 sections needs visual verification. | Deferred |
| 13 | gcal_include new record | Disabled state for new records not verified for Restaurants, Transportation, Checklist, Itinerary. Flights confirmed. | Deferred |
| 14 | Conformance / consistency pass | Group headers (gold color, 2px divider, 28px top margin) established in Restaurants — needs to be applied to all other sections. Broad pass deferred. | Future |
| 15 | Required field indicators | Visual indication of required fields across all section forms. Design deferred. | Future |
| 16 | Fatal error page | Dark theme feels foreboding. Needs design revisit. | Deferred |
| 18 | Overview | Section title missing — lost during header retooling. | Fix next session |
| 19 | Search | Full functionality gone — page exists but content/results missing. Broken during navigation redesign passes. | Fix next session |
| 20 | Hero meta separator | `·` separator and spacing between destination and dates disappears on iPad/iPhone. Renders correctly on Mac. Safari CSS issue. | Fix next session |
| 21 | Performance | Two slow points: Dashboard → trip load, and trip → Dashboard back navigation. Deferred until all sections stable. | Fix soon |

---

## Next Session
Fix Issues #18, #19, #20 first (in that order):
1. **Issue #18** — Restore Overview section title
2. **Issue #19** — Restore Search functionality (investigate what broke during navigation redesign)
3. **Issue #20** — Fix hero meta separator on iPad/iPhone Safari

After that:
- **Issue #21** — Performance: Dashboard ↔ trip navigation slowness
- **Issue #14** — Group header conformance pass across all sections
- **Issue #8** — Retrofit labels and placeholders across all section forms

---

## Navigation Architecture (complete — 00.01.0155–00.01.0164)

### What was built
The horizontal tab bar and multi-row header were replaced with a clean two-row sticky header + left sidebar navigation. This was a significant structural refactor across the session.

### Header structure (two rows)

**Row 1 — App level (40px, sticky top: 0, z-index: 31):**
`← Helm Dashboard` [left, gold underline link] ............. `[🔍]` [right, navigates to /search]

**Row 2 — Trip level (min-height: 64px, sticky top: 40px, z-index: 30):**
`[☰]` [left, opens sidebar] ... `Trip Name` [center, 40px Cormorant Garamond, wraps freely] ... `[📅]` [right, opens CalendarModal]

Components:
- `components/ui/DashboardBar.tsx` — Row 1
- `components/ui/TripTopBar.tsx` — Row 2. Props: `onOpenSidebar`, `tripName`, `onShowCalendar`, `calendarStatus`

### Sidebar
- `components/ui/TripSidebar.tsx` — slide-in left panel
- iOS scroll fix: fixed outer `<aside>` + scrollable inner `<div>` with `overflow-y: auto`, `-webkit-overflow-scrolling: touch`, `overscroll-behavior: contain`, `padding-bottom: env(safe-area-inset-bottom, 24px)`
- No fixed footer inside sidebar (known iOS failure mode — do not attempt)
- Header: HELM wordmark + trip name + dates + ✕ close button
- Nav groups: TRIP (Overview, Itinerary) / PLANNING (Checklist, Packing) / REFERENCE (Flights, Hotels, Transportation, Restaurants, Key Info) / APP (Logs, Calendar, Print, Import, Edit Trip, Clear Trip Data)
- Warn badges: orange count badge on sections with `action_required` items
- Calendar dot badge: orange dot = `update_required`, grey dot = `unconnected`, no dot = connected

### Calendar icon state
`calendarStatus` state in `TripDetailView` receives updates via `CalendarModal`'s `onStatusChange` prop. Flows to both `TripTopBar` (📅 icon dot badge) and `TripSidebar` (Calendar item dot badge). Toast fires when status transitions to `update_required`.

### TabNavigationContext
Extended with:
- `warnCounts: Record<string, number>` + `setWarnCount(section, count)` — sidebar badge counts
- `pendingSheetRecordId` / `clearPendingSheetRecord` — deep-link from Search results

### Files removed / replaced
- Old horizontal tab bar — removed from `TripDetailView`
- Old multi-row hero action buttons (Import, Print, Calendar, Edit, Clear, Logs) — removed from hero, moved to sidebar APP group
- `SearchBar` in old trip header — removed; Search now lives in DashboardBar Row 1

---

## CalendarModal Refactor (00.01.0159)

`CalendarButton.tsx` was split into:
- `components/advisor/CalendarModal.tsx` — owns all state, logic, JSX for Google Calendar integration (OAuth, sync, rename, clear, disconnect). Props: `{ tripId, tripName, open, onOpenChange, onStatusChange? }`
- `components/advisor/CalendarButton.tsx` — thin wrapper with own `open` state + trigger button + `<CalendarModal>`. Used standalone if needed elsewhere.

`TripDetailView` mounts `<CalendarModal>` directly (not `CalendarButton`) — no invisible button workaround.

---

## Search Architecture (complete — 00.01.0154, broken — 00.01.0155+)

### Decisions made
- **Scope:** Entire app — all trips, all sections
- **Entry point:** 🔍 icon in DashboardBar (Row 1), navigates to `/search`
- **Results display:** Full results page `/search`
- **Searchable content:** Text fields only — all text columns per section table
- **Result click behavior:** Navigate to correct trip + section, open record BottomSheet via deep-link
- **Logs in search:** Included via Logs toggle (off by default)

### What broke
Search functionality was lost during the navigation redesign (00.01.0155+). The `/search` page exists but results are missing. Root cause unknown — investigate at start of next session.

### Files (for reference during fix)
- `app/api/search/route.ts` — JS filtering across all 8 section tables + helm_logs
- `app/search/page.tsx` — server component, renders `SearchBackButton` + `SearchResults`
- `components/search/SearchBackButton.tsx` — client component, sticky back bar
- `components/search/SearchResults.tsx` — section pills + Logs toggle + result cards
- `components/search/SearchResultCard.tsx` — gold-bordered badge + deep-link

---

## Key Technical Notes

### Layout constants
- DashboardBar height: `40px`, `position: sticky`, `top: 0`, `z-index: 31`
- TripTopBar min-height: `64px`, `position: sticky`, `top: 40px`, `z-index: 30`
- TripSidebar: `position: fixed`, `height: 100dvh` (fallback `100vh`), `z-index: 50`
- Overlay: `z-index: 40`
- iOS safe area: `env(safe-area-inset-top, 0px)` and `env(safe-area-inset-bottom, 24px)` used throughout

### Packing checkboxes (rebuilt — 00.01.0157)
- Converted from styled `<button>` elements to native `<input type="checkbox">`
- `accentColor: 'var(--gold)'` for Owned, `accentColor: 'var(--navy)'` for Packed
- Each checkbox column: `minWidth: '48px'`, `flexShrink: 0`
- "Owned" / "Packed" column headers render once per group

### Known gotchas (carried forward)
- **params pattern**: all route handlers use `params: Promise<{ id: string }>` with `await params`
- **Checklist field**: task field is named `task`, not `title`
- **Checklist completed state**: field is `status: string`, value `'completed'` — not a boolean
- **Restaurants type constraint**: `restaurants_type_check` allows only `'included'` and `'independent'`
- **logger.ts**: server-side only — never import in client components
- **Supabase publishable key**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **File paths**: ChecklistClient and KeyInfoClient at `components/sections/`. Only OverviewClient under `components/trips/overview/`
- **TODOS dev port**: 3001. Helm dev port: 3000
- **Sidebar fixed footer**: do not attempt — known iOS failure mode

---

## Design Decisions (apply going forward)
- **Airport code → city + timezone auto-populate** (Flights only)
- **City select → timezone auto-set** (all other sections — not yet built)
- **State / Province** — single free text field, label "State / Province", placeholder "e.g. BC or WA"
- **Form group headers** — ALL CAPS, `var(--gold)` color, 2px divider line, 28px top margin (except first group). Established in Restaurants — conformance pass deferred.
- **Raw URLs never display as text on cards** — always rendered as labelled links (Map ↗, View Booking ↗, Website ↗)
- **Line clamps on cards**: style = 2 lines, notes = 3 lines, address = 1 line, action_note = 2 lines, URLs = labelled links only
- **`--action` token**: `#D4700A` — system-wide "needs attention" color with white text
- **`--critical` token**: `#C0390B` — system-level failure color, distinct from `--action`
- **Severity badges (Logs section)**: icon + label + color. Shape differentiates levels, not color alone. Uses Lucide icons per level.
- **WARN system**: `action_required = true` is a WARN condition in every section that has the field. WarnBadge inline on card, WarnBanner rollup at section top.
- **Search result cards**: gold-bordered section badge + title + subtitle. Deep-link opens correct section and record via `TabNavigationContext`.
- **Calendar status indicator**: dot badge pattern (not numeric). Orange = update_required, grey = unconnected, no dot = connected. Applied in both TripTopBar and TripSidebar.
- **Minimum touch target**: 44px on all interactive elements.
- **iOS font floor**: 11px minimum everywhere.

---

## Trip ID
`0e1d98a3-a124-42e1-b68d-498bb60f46be`

---

## Session Transaction Log

### Apr 15
- See Helm_Handoff_Apr15.md.

### Apr 16
- See Helm_Handoff_Apr16.md. Localhost magic link auth fixed. 00.01.0084 pushed to production.

### Apr 17a–17d
- See Helm_Handoff_Apr19.md.

### Apr 19 (morning)
- Auth bypass implemented. iOS usability review. Versions 00.01.0098–0103 pushed to production.

### Apr 19 (afternoon)
- Calendar feature designed and built (Steps 1–10). Version: 00.01.0110 (local only).

### Apr 20 (morning)
- Calendar OAuth confirmed working. Pushed to production: 00.01.0111
- Calendar test plan defined (8 blocks). Blocks 1 and 2 completed.
- Bugs F1–F7 found and resolved. Versions 00.01.0112–00.01.0121 pushed.

### Apr 20 (afternoon)
- Block 2 completed. Bug F7 resolved.
- Architecture decision: gcal_include opt-in model adopted.
- Full architecture plan documented. Blocks 3–8 on hold.
- Version: 00.01.0121 (local only)

### Apr 21
- gcal_include architecture built (schema + push handler + 6 API routes + 6 client components)
- Bugs F8, F8b, F8c, F9–F9e resolved
- Minimal viable Calendar test passed — checkbox persists, dirty flag correct, push end-to-end confirmed
- Versions 00.01.0122–00.01.0127 pushed to production

### Apr 22
- Calendar testing declared complete (minimal viable test = done)
- CAN26 → Helm parity audit begun — Flights first
- Flights parity build: 10 new schema columns, AIRPORT_LOOKUP auto-populate, timezone selects, seat number, terminal/gate, action_required, updated card UX. Version 00.01.0129.
- Bug B1 found and fixed: GET route for flights missing new columns — refetch was wiping field values after save
- Full GET route audit: all other sections use select('*') — no gaps. Flights was the only explicit list.
- Transportation parity: departure_timezone + arrival_timezone added. Version 00.01.0130.
- Hotels parity: province, postal_code, maps_url added. Version 00.01.0130.
- Restaurants parity: full redesign — 9 new schema columns, orphan `website` column dropped, full form reorganization (5 groups with gold headers), full card redesign. Version 00.01.0131.
- Bug B2 fixed: Button.tsx borderColor conflict — 4 React warnings eliminated. Fix applied across 7 files.
- Open Issue #11 closed.
- Open Issue #14 added: conformance pass for group headers across all sections (deferred).
- Restaurants card test partially complete — Test C pending next session.

### Apr 23 (morning)
- `--action` token darkened: `#E07B00` → `#D4700A`. Version 00.01.0133.
- CalendarButton post-push regression fixed. Version 00.01.0133.
- `pushHotels` and `pushChecklist` dirty reset made unconditional. Version 00.01.0135.
- Root cause of persistent State 3 fixed: `.is('deleted_at', null)` added to all 6 count queries. Version 00.01.0136.
- Transportation section title "v46" bug fixed. Version 00.01.0134.
- `RestaurantsSection.tsx` explicit column list replaced with `select('*')`. Version 00.01.0136.
- Restaurants card Test C passed. 00.01.0136 pushed to production.

### Apr 23 (afternoon)
- CAN26 → Helm parity audit: Itinerary and Checklist declared at sufficient parity. Parity audit complete across all sections.
- Error & Logging system designed: taxonomy (VALIDATION_ERROR / WARN / ERROR / CRITICAL / FATAL), warn conditions, error conditions, helm_logs schema, Logs section spec.
- Phase 1 built: helm_logs table created in Supabase, --critical/--critical-text tokens added, lib/logger.ts created, components/ui/PersistentMessage.tsx created. Version 00.01.0137.
- Phase 2 built: all 9 API routes wrapped in outer try/catch + logger.error on Supabase errors; calendar push SSE route outer try/catch added; FlightsClient setSaveError replaced with toast; ItineraryClient toast message standardized; HotelsClient neutral→error toast; 4 silent toggle reverts now show toast. Version 00.01.0138.
- 00.01.0138 pushed to production.

### Apr 24 (morning)
- Phase 3 (WARN system) built: WarnBadge component, WarnBanner pattern, WARN conditions wired for Flights/Hotels/Checklist. Version 00.01.0139.
- Flights validation guards added: flight number required, airline required, time requires date, arrival must be after departure. Version 00.01.0141.
- Hotels WARN model revised: missing check-in/check-out removed; action_required added as WARN. action_note column confirmed present. Version 00.01.0141.
- Checklist WARN unified: action_required added to getChecklistWarns; standalone Badge replaced with WarnBadge. Version 00.01.0141.
- UI check passed for Flights, Hotels, Checklist.
- Ghost flight record deleted via Supabase SQL — hard delete.
- Open Issue #15 added: required field indicators (design deferred).
- Phase 4 (Logs section) built: LevelBadge component, --error/--error-text/--fatal/--fatal-text CSS tokens, GET+DELETE API route, LogsClient, Logs tab added to nav. Version 00.01.0142.
- PersistentMessage.tsx copy updated. Version 00.01.0143.
- logger.ts env var bug fixed. Version 00.01.0144.
- Checklist API route: action_required WARN logging added. Version 00.01.0145.
- WARN system extended to Transportation, Restaurants, Itinerary. Transportation action_note column added. Version 00.01.0147.
- Log catchup SQL run: existing action_required records inserted into helm_logs.
- Pushed to production: 00.01.0147.

### Apr 24 (afternoon)
- Clear Trip modal double-render bug fixed. Version 00.01.0148.
- Logs moved out of section nav — now triggered from sidebar APP group. Back button removed. Versions 00.01.0149–00.01.0153.
- Dev Debug Panel built. Fatal error page redesigned. Open Issue #16 added. Versions 00.01.0150–00.01.0152.
- Pushed to production: 00.01.0153.

### Apr 24 (evening)
- Search architecture designed. Search built by AI2 — all 3 phases complete. Version 00.01.0154.
- Open Issue #17 added: `/search` page has no back navigation.

### Apr 25
- Navigation redesign: horizontal tab bar replaced with hamburger sidebar + two-row sticky header. Issues #17 resolved as part of this work. Versions 00.01.0155–00.01.0164.
  - 00.01.0155: TripSidebar, TripTopBar, TabNavigationContext extended with warnCounts, all 6 section clients call setWarnCount, overview grid single-column, SearchBackButton added, Issue #17 fixed.
  - 00.01.0156: DashboardBar created (28px → 40px), itinerary day card layout restructured (full-width date), Calendar moved to APP group as overlay, Packing checkboxes converted to native inputs with Owned/Packed headers, Flights section title added, Logs back button removed, Logs wiring fixed.
  - 00.01.0157: Packing List header restructured (title own row), checkbox columns fixed (minWidth, flexShrink), hero meta separator always visible, hero meta centered.
  - 00.01.0158: DashboardBar rewritten — Row 1 with ← Helm Dashboard + 🔍. TripTopBar rewritten — Row 2 with ☰ + trip name + 📅. CalendarButton.tsx split into CalendarModal + thin CalendarButton. calendarStatus state + onStatusChange prop wired. Calendar dot badge in sidebar. Toast on update_required.
  - 00.01.0159: CalendarModal extracted cleanly. Hero title (<h1>) removed — trip name now lives in TripTopBar. Hero meta simplified to destination + separator + dates. Overview single-column confirmed.
  - 00.01.0160: Trip name font size restored to 40px Cormorant Garamond. TripTopBar height 60px → 64px.
  - 00.01.0161: clamp() attempted for responsive font size — abandoned.
  - 00.01.0162: Trip name wrapping restored — removed whiteSpace/overflow/textOverflow constraints. Bar uses minHeight.
  - 00.01.0163: Absolute positioning attempted for trip name — abandoned (caused overflow onto hero).
  - 00.01.0164: Trip name restored as flex child with flexShrink: 0 on icon buttons. Wraps correctly on all platforms.
- Open Issues added: #18 (Overview title missing), #19 (Search functionality gone), #20 (hero meta separator missing on iOS), #21 (performance).
