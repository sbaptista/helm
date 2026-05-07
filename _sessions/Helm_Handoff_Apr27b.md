# Helm Handoff — Apr 27b

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
`00.02.0014` — pushed to production

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | ✅ Functional — section title restored | 00.02.0000 |
| Checklist | ✅ Functional + WARN system + required validation | 00.02.0014 |
| Packing | ✅ Functional — checkboxes rebuilt as native inputs | 00.01.0157 |
| Key Info | ✅ Functional + required validation | 00.02.0014 |
| Transportation | ✅ Functional + WARN system + action_note + required validation | 00.02.0014 |
| Hotels | ✅ Functional + WARN system + action_note + required validation | 00.02.0014 |
| Flights | ✅ Parity build complete + WARN system + required validation | 00.02.0014 |
| Restaurants | ✅ Full redesign complete + WARN system + required validation | 00.02.0014 |
| Itinerary | ✅ Parity declared complete + WARN system + required validation | 00.02.0014 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |
| Calendar | ✅ gcal_include opt-in architecture complete. CalendarModal + CalendarButton. Triggered from 📅 in TripTopBar and sidebar APP group. | 00.01.0159 |
| Logs | ✅ Complete — Phase 1–4 done + clear-all option. Triggered from sidebar APP group. | 00.02.0014 |
| Search | ✅ Rebuilt — whole-word toggle, match highlighting, matched field label, clear button, Esc to clear | 00.02.0000 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate internally | Future enhancement |
| 6 | iPad magic link | OTP / magic link investigation set aside. Auth bypass in place instead. | Set aside |
| 10 | Trip header actions | Import Document — confirm whether still active or can be removed. | Future |
| 22 | iOS touch freeze | App stops receiving taps, requires browser tab refresh. Cannot reproduce on demand. Suspected: sidebar overlay not fully unmounting. Monitor — capture conditions when it next occurs. | Monitor |

---

## Next Session
No outstanding items. All issues from this session are resolved and pushed to production at `00.02.0014`.

---

## Required Field Validation System (complete — 00.02.0014)

### Final design (as built)
- **Trigger:** On blur, per field — flags immediately when leaving an empty required field
- **Visual:** 3px red border on the input + small "Required" text below the field (via `FormField` `error` prop)
- **Persistence:** Red clears as soon as the field is filled (reactive)
- **Save block:** Save button disabled when any required field has an error
- **On save attempt:** All required fields are touched programmatically before the guard check, so any unfilled fields light up even if the user never blurred them
- **No validation toasts** — decision: leave them out entirely

### Pattern — Set-based (2+ required fields)
Used in: Flights, Checklist, Restaurants, Transportation, Hotels, Key Info (Hotels uses inline spread; others use `inputStyle(hasError)`)
```tsx
const [touched, setTouched] = useState<Set<string>>(new Set())
function touchField(name: string) { setTouched(prev => new Set(prev).add(name)) }
const fieldError = touched.has('fieldName') && !form.fieldName.trim()
// onBlur: () => touchField('fieldName')
// openAdd/openEdit: setTouched(new Set())
// handleSave: setTouched(prev => new Set([...prev, 'fieldName', ...])); if (fieldError) return
// disabled: saving || fieldError
```

### Pattern — Boolean (1 required field)
Used in: Itinerary (rowTitleTouched), Key Info (labelTouched)
```tsx
const [fieldTouched, setFieldTouched] = useState(false)
const fieldError = fieldTouched && !fieldValue.trim()
// onBlur: () => setFieldTouched(true)
// openAdd/openEdit: setFieldTouched(false)
// handleSave: setFieldTouched(true); if (!fieldValue.trim()) return
```

### `components/ui/FormField.tsx`
- `inputStyle(hasError)`: border `3px solid var(--red)` on error, `1px solid var(--border2)` normally
- `border-width` added to CSS transition
- `inputFocusStyle(hasError)`: same logic

### What it replaces vs. keeps
- **Replaces:** Simple required-field toasts
- **Keeps:** Conditional/cross-field validation toasts (arrival after departure, date required when time is set)
- **Keeps entirely:** WARN system — record-level concern, not form validation

---

## ErrorBoundary Fatal Logging (complete — 00.02.0014)

### Files
- **`components/ui/ErrorBoundary.tsx`** — `componentDidCatch` fire-and-forgets `POST /api/logs` with `level: 'FATAL'`, `source: 'ErrorBoundary'`, `message`, and `payload: { stack, componentStack }`
- **`app/api/logs/route.ts`** — NEW. Unauthenticated POST endpoint (intentional — must work even if auth is broken). Accepts `{ level, source, message, payload }`, maps to `lib/logger` method.

### Why unauthenticated
Fatal errors can fire before auth resolves. The endpoint must always be reachable.

---

## Logs Clear-All (complete — 00.02.0014)

- `LogsClient.tsx`: `confirmMode: null | 'days' | 'all'` (replaced `showConfirm: boolean`). New "Clear All" button. Confirm text differs by mode.
- `app/api/trips/[id]/logs/route.ts`: DELETE handler extended — `?all=true` deletes all logs for the trip (and global `trip_id IS NULL` entries).

---

## Offline / Error Page System (complete — 00.02.0003–0004)

### Visual design (approved)
- **Background:** `#0D1E35` (app `--navy`)
- **Gold:** `#B8892A` (app `--gold`)
- **Three-layer architecture:**
  - Layer 1: 3 shooting stars (`position: fixed`) — top-right → bottom-left, JS-controlled random dwell
  - Layer 2: ~26 twinkling gold stars (`position: fixed`, vw/vh positioned)
  - Layer 3: Content unit — cream wheel (opacity 0.20, spinning), north star, HELM wordmark, text, divider, status pill
- **Fonts:** Cormorant Garamond (headlines) + Lato (body)
- **Version string:** bottom-left, `left: 16px`, `rgba(242,237,228,0.45)`

### Shooting star timing (JS-controlled)
- m1 (140px, 4.8s): dwell 6–18s
- m2 (88px, 3.6s): dwell 10–24s (rarest)
- m3 (175px, 6.2s): dwell 4–14s (most frequent)

### Two scenarios

**Offline (`OfflinePage.tsx`):**
- Title: "Taking a breather"
- No retry button — auto-resumes when connection returns
- Status pill: "● Offline"
- CSS prefix: `hop-`

**Fatal Error (`FatalErrorPage.tsx`):**
- Title: "Something went wrong"
- Reload button: `window.location.reload()`
- Timestamp: JS-generated at render time
- Status pill: "● Error"
- CSS prefix: `hep-`

### Wiring
- `app/api/health/route.ts` — GET returns `{ ok: true }`
- `hooks/useOnlineStatus.ts` — polls `/api/health` every 10s, returns `isOnline: boolean`
- `TripDetailView` — outer wrapper owns `useOnlineStatus` + early return to `<OfflinePage />`. Inner (`TripDetailViewInner`) owns all other hooks. Do not merge back together.
- `ErrorBoundary` (class component) wraps `{children}` in `app/layout.tsx`
- `ServiceWorkerKiller` — unregisters stale service workers on mount, in `app/layout.tsx`
- `transform-box: fill-box; transform-origin: center center` required on wheel `.W` group for correct rotation

---

## Navigation Architecture (complete — 00.01.0155–00.01.0164)

### Header structure (two rows)

**Row 1 — App level (40px, sticky top: 0, z-index: 31):**
`← Helm Dashboard` [left, gold underline link] ............. `[🔍]` [right, navigates to /search]

**Row 2 — Trip level (min-height: 64px, sticky top: 40px, z-index: 30):**
`[☰]` [left, opens sidebar] ... `Trip Name` [center, 40px Cormorant Garamond, wraps freely] ... `[📅]` [right, opens CalendarModal]

Components:
- `components/ui/DashboardBar.tsx` — Row 1
- `components/ui/TripTopBar.tsx` — Row 2
- `components/ui/TripSidebar.tsx` — slide-in left panel

### Sidebar nav groups
TRIP (Overview, Itinerary) / PLANNING (Checklist, Packing) / REFERENCE (Flights, Hotels, Transportation, Restaurants, Key Info) / APP (Logs, Calendar, Print, Import, Edit Trip, Clear Trip Data)

---

## Search Architecture (complete — 00.02.0000)

### Features
- **Entry point:** 🔍 icon in DashboardBar → `/search` page
- **Input:** Debounced (200ms), clear (×) button, Esc to clear
- **Whole-word toggle:** pill button, sends `?mode=whole_word` to API
- **Match highlighting:** gold `<mark>` spans on title and subtitle
- **Matched field label:** italic muted text below subtitle ("matched in: notes")
- **Section pills + Logs toggle**

### Files
- `app/api/search/route.ts` — searches all 8 section tables + helm_logs
- `app/search/page.tsx` — server component
- `components/search/SearchBackButton.tsx` — sticky back bar with input
- `components/search/SearchResults.tsx` — pills, toggle, result cards
- `components/search/SearchResultCard.tsx` — gold-bordered badge + deep-link + highlighting

---

## Key Technical Notes

### Layout constants
- DashboardBar height: `40px`, `position: sticky`, `top: 0`, `z-index: 31`
- TripTopBar min-height: `64px`, `position: sticky`, `top: 40px`, `z-index: 30`
- TripSidebar: `position: fixed`, `height: 100dvh`, `z-index: 50`
- Overlay: `z-index: 40`

### gcal_include checkbox (standardised 00.02.0002)
- All 6 sections: `width: 20px; height: 20px; accentColor: 'var(--gold)'`
- Disabled when date field is empty (all sections confirmed)
- Helper text shown when disabled

### Known gotchas (carried forward)
- **params pattern**: all route handlers use `params: Promise<{ id: string }>` with `await params`
- **Checklist field**: task field is named `task`, not `title`
- **Checklist completed state**: field is `status: string`, value `'completed'` — not a boolean
- **Restaurants type constraint**: `restaurants_type_check` allows only `'included'` and `'independent'`
- **logger.ts**: server-side only — never import in client components. Client-side logging goes via `POST /api/logs`.
- **Supabase publishable key**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **File paths**: ChecklistClient and KeyInfoClient at `components/sections/`. Only OverviewClient under `components/trips/overview/`
- **TODOS dev port**: 3001. Helm dev port: 3000
- **Sidebar fixed footer**: do not attempt — known iOS failure mode
- **Offline/Error pages**: `transform-box: fill-box; transform-origin: center center` required on wheel `.W` group for correct rotation at any display size
- **TripDetailView**: outer wrapper owns `useOnlineStatus` only. All other hooks live in `TripDetailViewInner`. Do not merge them back together.
- **Required field validation**: on-blur per field using `touched: Set<string>` (2+ fields) or `fieldTouched: boolean` (1 field). Never show red borders on untouched forms. Conditional/cross-field toasts stay as toasts.
- **Hook declaration order**: computed values that reference state variables must be declared AFTER those `useState` calls — React TDZ will crash at runtime if not.
- **SVG capability**: Claude can generate geometric/constructed inline SVGs (icons, logo marks, decorative elements, data viz). Both offline and fatal error pages use inline SVG (helm wheel + north star polygon).

---

## Design Decisions (apply going forward)
- **Airport code → city + timezone auto-populate** (Flights only)
- **City select → timezone auto-set** (all other sections — not yet built)
- **State / Province** — single free text field, label "State / Province", placeholder "e.g. BC or WA"
- **Form group headers** — ALL CAPS, `var(--gold)` color, 2px divider line, 28px top margin (except first group). Established in Restaurants — conformance pass deferred.
- **Tooltips** — native `title` attributes on form field inputs across all 7 section forms
- **Version string** — `rgba(242,237,228,0.45)` on dark backgrounds, bottom-left `left: 16px`
- **Offline/Error pages** — night scene design system (`#0D1E35` navy, cream wheel, `#B8892A` gold stars, shooting stars). Clean human copy, no technical details. Logs section handles technical detail.
- **Required field validation** — on-blur red border + "Required" text. `touched` Set or boolean per form. Replaces simple required-field toasts; keeps conditional/cross-field toasts and WARN system.

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
- Navigation redesign: horizontal tab bar replaced with hamburger sidebar + two-row sticky header. Issues #17 resolved. Versions 00.01.0155–00.01.0164.
- Open Issues added: #18 (Overview title missing), #19 (Search functionality gone), #20 (hero meta separator missing on iOS), #21 (performance).

### Apr 26
- **Issue #18** fixed: Overview section title `<h2>Overview</h2>` restored. Version 00.02.0000.
- **Issue #19** fixed: Search input rebuilt in `SearchBackButton.tsx` (debounced, controlled). Search API bug fixed: `checklist_items` → `checklist`, `.is('deleted_at', null)` added to checklist/key_info/packing queries. Version 00.02.0000.
- **Issue #20** fixed: Hero meta separator changed to `|`, wrapped in explicit `<span>` with `display: inline-block`. Parent container given `display: flex; alignItems: center`. Version 00.02.0000.
- **Search upgraded**: whole-word toggle, match highlighting (gold `<mark>`), matched field label, clear (×) button, Esc to clear. API updated with `matchedField()` function and `?mode=whole_word` param. `matched_field` added to `SearchResult` interface. Version 00.02.0000.
- Pushed to production: `v00.02.0000`.
- **Issue #21** (performance) fixed: 5 full data fetches removed from `page.tsx` `Promise.all` (was 14, now 9). Print data now fetched lazily inside `PrintExportModal` on `open`. `router.prefetch('/advisor/dashboard')` added on mount. `checklist_items` → `checklist` also fixed in page.tsx HEAD count query. Version 00.02.0001.
- **Issues #7, #8, #9, #12, #13** batch fix. Version 00.02.0002. Pushed to production.
- **Issues #4, #5, #14** closed (no code change — design decisions).
- **Issue #22** added: iOS touch freeze, cannot reproduce on demand, monitor.
- **Offline/Error page system designed:** art direction brief written, night scene approved, mockups approved.

### Apr 27a
- Shooting star timing converted from CSS `infinite` to JS-controlled random dwell (per-star ranges: m1 6–18s, m2 10–24s, m3 4–14s). Both mockups updated and approved.
- Background corrected to `#0D1E35` (app `--navy`), gold corrected to `#B8892A` (app `--gold`). Version string moved to bottom-left `left: 16px`.
- Offline/Error page system wired into Helm — 8 operations: `api/health`, `useOnlineStatus`, `OfflinePage`, `FatalErrorPage`, `ErrorBoundary`, `ServiceWorkerKiller`, `layout.tsx` wrap, `TripDetailView` gating. Version 00.02.0003.
- Hooks order violation fixed: `TripDetailView` split into outer wrapper (owns `useOnlineStatus` + early return) and `TripDetailViewInner` (all existing hooks). `ToastProvider` wrap preserved. Version 00.02.0004.
- **Open Issue #16 closed.**
- Versions 00.02.0003–00.02.0004 pushed to production.
- **Issue #15 redesigned:** Required field validation overhauled. Design changed from on-save-attempt to **on-blur per field**. `FormField` updated (3px red border, "Required" text). Flights built as reference implementation.

### Apr 27b
- **Issue #15 complete:** Required field validation rolled out to all 6 remaining sections — Checklist, Restaurants, Transportation, Hotels, Itinerary, Key Info. Set-based `touched` pattern for multi-field forms; boolean `fieldTouched` for single-field forms. Save button disabled on error. No validation toasts.
- **ErrorBoundary logging:** `componentDidCatch` now POSTs to new unauthenticated `app/api/logs/route.ts` endpoint. Fatal render errors appear in `helm_logs` with stack + componentStack payload.
- **Logs clear-all:** `confirmMode: null | 'days' | 'all'` added to LogsClient. "Clear All" button added. DELETE route extended with `?all=true`.
- **Key Info hook order crash fixed:** `labelError` was declared before `itemLabel` useState — TDZ ReferenceError. Fixed by reordering declarations.
- **Redundant offline banner removed:** `TripDetailViewInner` had its own `isOffline` state + sticky warning banner that fired before `OfflinePage` took over. Removed entirely.
- Versions 00.02.0005–00.02.0014 (local increments). Pushed to production: `v00.02.0014`.
