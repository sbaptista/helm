# Helm Handoff — Apr 10c

## Working Rules
0. **Never build without Stan's explicit go-ahead.**
1. **Plan first. Wait for confirmation. Then build.**
2. **Never propose a plan and immediately build in the same response.**
3. **Stan sets the pace.**
4. **Schema-first.** Query `information_schema.columns` before writing any insert code.
5. **Every git push gets a version bump — no exceptions.**
6. **Handoff is generated silently via present_files. No narration.**

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
`00.01.0062` — localhost verified ✅ — **ready to push**

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
| Itinerary | ✅ Stage 1 complete — ready to push | 00.01.0062 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Button.tsx | React warning: mixing `border` and `borderColor` shorthand in delete button style | Low priority |
| 2 | Globals | `.line-clamp-3` not applied everywhere applicable | Next session |
| 3 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade to change. Workaround: stop `npm run dev` (Ctrl+C) before logging into production | Known / deferred |
| 4 | 3x5 Cards | Content-aware card splitting (Option B) deferred — see Key Technical Notes | Future |
| 5 | Itinerary | Day type missing "Sightseeing" option — needs icon, border color, and select option added | Next session |

---

## Next Session
- Push `00.01.0062` to production and verify
- Add Sightseeing day type (Issue #5)
- Begin Itinerary Stage 2: schema additions + UI for `is_approx`, `is_provided`, `action_required`, `action_note`
- Begin Itinerary Stage 3: line-clamp on row descriptions, category as select, confirmDelete state fix

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
- **3x5 card print overhaul** — `components/advisor/print/CardTemplates.tsx`:
  - Header collision fix: side-label moved to direct child of card-page, `top: 0.20in`, `zIndex: 2` ✅
  - Left padding reduced: `0.38in → 0.28in`; footer left offset matched ✅
  - Mountain height `28→44`, opacity `0.80→0.65` ✅
  - Font sizes bumped across all elements ✅
  - Footer left label → dynamic printed date (`Printed MM/DD/YYYY`) ✅
  - Content div `maxHeight` + `overflow: hidden` to prevent footer collision ✅
- **Card chunk sizes** in `PrintExportModal.tsx`: Hotels, Restaurants, Transportation `4→3` per card ✅
- **LoginForm auth redirect fixed** — `emailRedirectTo` changed from `getURL()` to `window.location.origin`; unused import removed ✅
- Pushed `00.01.0059` — **build failed** (TypeScript errors not caught by dev mode):
  - `tripTitle` missing from `PrintExportModalProps` → fixed → `00.01.0060` ✅
  - `children` missing on `<Modal>` in `TripDetailView.tsx` → wrapped in fragment → `00.01.0061` ✅
- Production verified at `helm-gilt.vercel.app` ✅
- **Auth session behaviour confirmed**: closing browser tab does not end a Supabase session. Must stop `npm run dev` (Ctrl+C) before logging into production to avoid single-session conflict.
- **Magic link redirect confirmed working** post `00.01.0061`.

### Apr 10b
- **Itinerary gap analysis** — full comparison of CAN26 vs Helm itinerary conducted using CAN26 `index.html` and `CAN26_data_2026-04-10.json`.
- **Schema reviewed** — `itinerary_days` and `itinerary_rows` columns confirmed. `trips` table confirmed to have `departure_date` and `return_date`.
- **Itinerary staged plan agreed:**
  - Stage 1: Fundamental usability (sort by date, collapsible days, day type, timezone-aware times, Pre-Trip label, all-day rows)
  - Stage 2: Data richness (`is_approx`, `is_provided`, `action_required`, `action_note`)
  - Stage 3: Polish (line-clamp, category select, confirmDelete fix)
- **Timezone strategy: Option A confirmed** — store UTC timestamps with explicit `timezone` (IANA) per row. Foundation for future calendar/ICS export.
- **Calendar export noted** as future deliverable — depends on Option A timezone storage.
- **Schema migrations applied** by Stan in Supabase:
  - `ALTER TABLE itinerary_days ADD COLUMN type text NOT NULL DEFAULT 'free'`
  - `ALTER TABLE itinerary_rows ADD COLUMN timezone text`
  - `ALTER TABLE itinerary_rows ADD COLUMN is_all_day boolean NOT NULL DEFAULT false`
- **Stage 1 implemented** by AI2 — `ItineraryClient.tsx` major rewrite, `ItinerarySection.tsx` updated. Version bumped to `00.01.0062`.

### Apr 10c (this session)
- **Hydration error fixed** — day card `<button>` changed to `<div onClick>` to allow nested Edit `<button>` without invalid HTML.
- **Day card layout overhauled** — removed `className="section-row"` (was fighting flex layout), replaced with explicit inline styles: `flexDirection: 'row'`, left-aligned content, large muted day number, type icon + date, title, location, Edit button + chevron on right.
- **`.day-card` CSS class added to `globals.css`** — handles background (`var(--bg2)`), hover (`var(--cream)`), and smooth transitions for both `box-shadow` and `background`. Inline `background` removed from div so CSS hover wins correctly.
- **Spacing fixed** — outer container gap `32px → 8px`; day wrapper `marginBottom: '24px' → '0'`.
- **Chevron fixed** — enlarged to 18px, `display: inline-block`, `minWidth: 44px`, `rotate(90deg)` when expanded, explicit `onClick` added so it works inside the `stopPropagation` zone.
- **Stage 1 localhost verified ✅** — ready to push as `00.01.0062`.

---

## Key Technical Notes
- `itinerary_days` columns: `id, trip_id, day_date, day_number, title, location, notes, sort_order, created_at, deleted_at, type`
- `itinerary_rows` columns: `id, day_id, trip_id, start_time, end_time, title, description, location, category, sort_order, created_at, deleted_at, timezone, is_all_day`
- Days sort by `day_date` (not `sort_order`). Manual reorder not applicable.
- Rows sort: all-day first, then by `start_time`, then `sort_order` as tiebreaker. Manual reorder not applicable.
- `day_number === 0` renders as "PRE-TRIP".
- Day types: `flight` ✈️, `train` 🚂, `free` 🌄, `transit` 🚌. "Sightseeing" type pending (Issue #5).
- Day card uses `.day-card` CSS class for hover/background — do NOT add inline `background` to day card div or hover will break.
- `section-row` class is NOT used on day cards — it fights the flex row layout. Day cards use explicit inline styles + `.day-card` class only.
- Timezone storage: UTC ISO in DB, displayed in local timezone via `Intl.DateTimeFormat`. HST shown as secondary label for non-Honolulu rows.
- Trip date range (`departure_date`, `return_date`) from `trips` table passed as props to constrain date pickers.
- TRIP_CITIES timezone map: Honolulu=`Pacific/Honolulu`, Vancouver/Kamloops=`America/Vancouver`, Jasper/Lake Louise/Banff=`America/Edmonton`.
- **Future:** Calendar/ICS export — depends on timezone-per-row storage (already in place).
- Stage 2 schema not yet applied: `is_approx`, `is_provided`, `action_required`, `action_note` all pending.
- API routes follow pattern: service role client for data, SSR client for auth only.
- Form fields must always initialize to `''` not `null` for controlled inputs.
- Payload to API must explicitly list only valid DB columns — never spread the whole form object.
- **3x5 card splitting** is count-based (`chunkArray` in `PrintExportModal.tsx`). Current chunk sizes: Flights 4, Hotels 3, Transportation 3, Restaurants 3, Daily Itinerary 6. Option B (content-aware splitting using line weights) deferred for future consideration.
- **3x5 print architecture**: html2canvas → jsPDF pipeline (not browser print). Mountain is canvas-drawn via `drawMountainIntoCanvas()`. `@page { margin: 0 }` must stay. Right padding (`0.50in`) validated against Epson hardware margin — do not reduce. Left padding (`0.28in`) is safe to adjust.
- **Magic link redirect**: both `LoginForm.tsx` and `CreateAccountForm.tsx` now use `window.location.origin`. `http://localhost:3000/**` added to Supabase allowed redirect URLs.
- **TypeScript strictness**: production build catches type errors dev mode ignores. After any props/interface changes, watch Vercel build logs closely.
- **Claude Code confirmed as AI2**: included in Pro plan at no extra cost. Version bumps done by Claude Code; git push done by Stan in a separate terminal.
