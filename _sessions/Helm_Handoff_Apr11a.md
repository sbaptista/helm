# Helm Handoff — Apr 11a

## Working Rules
0. **Never build without Stan's explicit go-ahead.**
1. **Plan first. Wait for confirmation. Then build.**
2. **Never propose a plan and immediately build in the same response.**
3. **Stan sets the pace.**
4. **Schema-first.** Query `information_schema.columns` before writing any insert code.
5. **Every git push gets a version bump — no exceptions.**
6. **Handoff is generated silently via present_files. No narration.**
7. **Localhost-first development.** All implementation and testing is done on `localhost:3000`. Version bumps happen continuously as changes are made — they reflect that the local version is ahead of production. Git pushes happen only when Stan decides enough changes have accumulated to warrant a release.

## AI Roles
1. **AI1:** Architect / Designer / Planner / Handoff Maintainer (e.g., Claude, Perplexity)
2. **AI2:** Code Implementer (e.g., Cursor, Claude Code)

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

---

## Current Version
`00.01.0066` — localhost verified ✅ — **not yet pushed**

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Checklist | ✅ Functional | 00.01.0050 |
| Packing | ✅ Functional | 00.01.0050 |
| Key Info | ✅ Functional (Gold Standard CRUD) | 00.01.0054 |
| Transportation | ✅ Functional + section-row styling | 00.01.0058 |
| Hotels | ✅ Functional + section-row styling | 00.01.0058 |
| Flights | ✅ Functional | 00.01.0056 |
| Restaurants | ✅ Functional + section-row styling | 00.01.0058 |
| Itinerary | ✅ Stages 1 & 2 complete | 00.01.0066 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Button.tsx | React warning: mixing `border` and `borderColor` shorthand — **fixed globally** | ✅ Closed |
| 2 | Globals | `.line-clamp-3` not applied everywhere applicable | Next session |
| 3 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade to change. Workaround: stop `npm run dev` (Ctrl+C) before logging into production | Known / deferred |
| 4 | 3x5 Cards | Content-aware card splitting (Option B) deferred — see Key Technical Notes | Future |
| 5 | Itinerary | Day type missing "Sightseeing" option | ✅ Closed |
| 6 | Itinerary | UI cleanup items — Stan to provide list | Next session |

---

## Next Session
- Push `00.01.0066` to production and verify
- Stan's itinerary UI cleanup list (Issue #6)
- Itinerary Stage 3: line-clamp on row descriptions, category as `<select>`, `confirmDelete` state fix
- Begin Itinerary Stage 3 polish pass

---

## Session Transaction Log

### Apr 09a
- Recalibrated 3x5 card margins to inch-based padding for Epson hardware offsets.
- Bumped to `00.01.0058`.

### Apr 09b
- **Diagnosed card header collision** — fix prepared, not yet applied.
- **Restored Itinerary CRUD** — 4 new API routes, `ItineraryClient.tsx` built, all CRUD verified.
- **Standardized section row styling** — `.section-row` class added to globals.css. Applied to Transportation, Hotels, Restaurants.

### Apr 10a
- **3x5 card print overhaul** — `components/advisor/print/CardTemplates.tsx`.
- **LoginForm auth redirect fixed** — `emailRedirectTo` changed to `window.location.origin`.
- Pushed `00.01.0059` through `00.01.0061` — production verified ✅
- **Auth session behaviour confirmed**: must stop `npm run dev` before logging into production.

### Apr 10b
- **Itinerary gap analysis** — full CAN26 vs Helm comparison.
- **Staged plan agreed** — Stage 1 (usability), Stage 2 (data richness), Stage 3 (polish).
- **Timezone strategy: Option A** — UTC + IANA timezone per row.
- **Schema migrations applied**: `type` on `itinerary_days`, `timezone` + `is_all_day` on `itinerary_rows`.
- **Stage 1 implemented** — version `00.01.0062`.

### Apr 10c
- **Hydration errors fixed** — `suppressHydrationWarning` on all date/time elements, day card div, chevron span.
- **Day card layout overhauled** — `.day-card` CSS class, inline styles, spacing fixed.
- **Stage 1 localhost verified ✅**

### Apr 11a (this session)
- **Sightseeing day type added** — icon 🗺️, color `var(--red)`, select option, type union updated. Issue #5 closed. → `00.01.0063`
- **Border shorthand conflict fixed globally** — `FormField.tsx`, `Button.tsx`, `iconBtnStyle` in Checklist/KeyInfo/Packing. Issue #1 closed.
- **Stage 2 implemented** — `is_approx`, `is_provided`, `action_required`, `action_note` added to schema and UI. → `00.01.0064`
- **Responsive overhaul** — four-part pass:
  - Part A: `content-container` max-width 960px centered, applied to trip detail content area
  - Part B: Three-tier responsive type system in `globals.css` — layout at 900px (width), type at pointer queries (iPad tier ≥768px touch, iPhone tier <768px touch)
  - Part C: `ResponsiveSheet` component — renders `Modal` on ≥900px, `BottomSheet` on <900px
  - Part D: All 8 section clients updated to use `ResponsiveSheet`
  - Modal padding updated to match target spec. All border shorthand conflicts resolved globally.
  → `00.01.0065`
- **Timezone schema updated** — `timezone` renamed to `start_timezone`, `end_timezone` added. UI updated: separate Timezone selector per start/end group. Fallback: `end_timezone ?? start_timezone` for display. → `00.01.0066`

---

## Key Technical Notes

### Itinerary Schema
- `itinerary_days` columns: `id, trip_id, day_date, day_number, title, location, notes, sort_order, created_at, deleted_at, type`
- `itinerary_rows` columns: `id, day_id, trip_id, start_time, end_time, title, description, location, category, sort_order, created_at, deleted_at, start_timezone, end_timezone, is_all_day, is_approx, is_provided, action_required, action_note`
- Days sort by `day_date`. Rows sort: all-day first, then `start_time`, then `sort_order`.
- `day_number === 0` renders as "PRE-TRIP".
- Day types: `flight` ✈️, `train` 🚂, `free` 🌄, `transit` 🚌, `sightseeing` 🗺️
- Day card uses `.day-card` CSS class — do NOT add inline `background` or hover will break.
- `section-row` class NOT used on day cards — use explicit inline styles + `.day-card` only.
- `end_timezone` falls back to `start_timezone` for display and UTC conversion when not set.
- Stage 3 not yet started: line-clamp on row descriptions, category as `<select>`, `confirmDelete` fix.

### Responsive Architecture
- **Layout breakpoints (width-based):** 900px = single column, actions visible; 480px = further layout changes. No type rules at these breakpoints.
- **Type scale (pointer-based):** `(hover:none) and (pointer:coarse) and (min-width:768px)` = iPad tier; `(hover:none) and (pointer:coarse) and (max-width:767px)` = iPhone tier. Mac always gets base CSS sizes regardless of window width.
- **ResponsiveSheet:** renders `Modal` on ≥900px, `BottomSheet` on <900px. Uses `window.matchMedia` with change listener. Drop-in replacement for `BottomSheet` — same prop API.
- **content-container:** max-width 960px, centered, applied to section content wrapper in `TripDetailView.tsx`. Header/hero/tab bar remain at 1200px.

### General
- Trip date range (`departure_date`, `return_date`) from `trips` table passed as props to constrain date pickers.
- TRIP_CITIES timezone map: Honolulu=`Pacific/Honolulu`, Vancouver/Kamloops=`America/Vancouver`, Jasper/Lake Louise/Banff=`America/Edmonton`.
- API routes: service role client for data, SSR client for auth only.
- Form fields must always initialize to `''` not `null` for controlled inputs.
- Payload to API must explicitly list only valid DB columns — never spread the whole form object.
- **TypeScript strictness**: production build catches type errors dev mode ignores. Watch Vercel build logs after any props/interface changes.
- **Magic link redirect**: `window.location.origin` in both `LoginForm.tsx` and `CreateAccountForm.tsx`.
- **3x5 print architecture**: html2canvas → jsPDF. Right padding `0.50in` validated — do not reduce. Option B (content-aware splitting) deferred.
- **Claude Code confirmed as AI2**: included in Pro plan. Version bumps done by Claude Code; git push done by Stan.
