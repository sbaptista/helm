# Helm Handoff — Apr 11b

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
`00.01.0068` — localhost verified ✅ — **not yet pushed**

Includes: line-clamp on flight notes and itinerary row descriptions, Sign Out button, `confirmDelete` split. All verified on localhost. Ready to push.

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Checklist | ✅ Functional | 00.01.0050 |
| Packing | ✅ Functional | 00.01.0050 |
| Key Info | ✅ Functional (Gold Standard CRUD) | 00.01.0054 |
| Transportation | ✅ Functional + section-row styling | 00.01.0058 |
| Hotels | ✅ Functional + section-row styling | 00.01.0058 |
| Flights | ✅ Functional + line-clamp on notes | 00.01.0068 |
| Restaurants | ✅ Functional + section-row styling | 00.01.0058 |
| Itinerary | ✅ Stages 1 & 2 complete, Stage 3 in progress | 00.01.0067 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Button.tsx | React warning: mixing `border` and `borderColor` shorthand — fixed globally including ItineraryClient delete buttons | ✅ Closed |
| 2 | Globals | `.line-clamp-3` applied to FlightsClient notes and ItineraryClient row descriptions | ✅ Closed |
| 3 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade to change. Workaround: stop `npm run dev` (Ctrl+C) before logging into production | Known / deferred |
| 4 | 3x5 Cards | Content-aware card splitting (Option B) deferred — see Key Technical Notes | Future |
| 5 | Itinerary | Day type missing "Sightseeing" option | ✅ Closed |
| 6 | Itinerary | `confirmDelete` state split into `confirmDeleteDay` / `confirmDeleteRow` | ✅ Closed |
| 7 | Auth | Magic link redirect fix — `process.env.NEXT_PUBLIC_SITE_URL` in LoginForm.tsx and CreateAccountForm.tsx | ✅ Closed (pushed in 00.01.0066, verify next natural sign-out) |
| 8 | Dashboard | Sign Out button added to header — works on all screen sizes | ✅ Closed (in 00.01.0068 batch) |

---

## Next Session
1. **Confirm AI2 completed `confirmDelete` split** — if not done, complete it first
2. **Push `00.01.0068`** — includes line-clamp, sign out button, confirmDelete fix (batch all together)
3. **Itinerary Stage 3 remaining** — polish pass (see Key Technical Notes)
4. **Overview section** — new section to precede all others, modelled on CAN26 Overview
5. **HST removal** — separate pass, touches many sections (deferred from this session)
6. **Mobile sign out** — currently hidden on mobile via FAB layout; revisit if needed

---

## Itinerary UI Cleanup List (Stan's List)
Items addressed this session:

| # | Item | Status |
|---|---|---|
| 1 | Remove HST displays unless local TZ | Deferred — separate pass, many sections affected |
| 2 | Day field for Itineraries is read-only — needs to be modifiable | ✅ Done — Day selector is now an editable `<select>` |
| 3 | Edit Modals patterned after CAN26 — Date/Time/TZ on one grouped row with borders | ✅ Done — Timing fieldset with legend, responsive grid |
| 4 | Field descriptions and tooltips | ✅ Done — inline helper text under labels, checkbox sub-descriptions |
| 5 | All Day and Estimated checkboxes near date fields | ✅ Done — both inside Timing fieldset |

---

## Session Transaction Log

### Apr 11a (previous session)
- See previous handoff.

### Apr 11b (this session)
- **Pushed `00.01.0066`** — Itinerary timezone rename (`timezone` → `start_timezone`, `end_timezone` added).
- **Magic link fix** — `emailRedirectTo` changed from `window.location.origin` to `process.env.NEXT_PUBLIC_SITE_URL/auth/callback` in `LoginForm.tsx` (line 84) and `CreateAccountForm.tsx` (line 112). `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local`; `NEXT_PUBLIC_SITE_URL=https://helm-gilt.vercel.app` in Vercel env vars.
- **Itinerary modal redesign** — Day Sheet and Row Sheet rebuilt per CAN26 pattern: Timing fieldset with legend, Start/End groups in responsive 3-column grid (`.timing-grid` CSS class), All Day + Estimated checkboxes inside fieldset with sub-descriptions, editable Day selector, Category as `<select>` with 7 preset options, field helper text. → `00.01.0067`
- **Row sort fix** — GET route at `app/api/trips/[id]/itinerary/rows/route.ts` updated to order by `is_all_day DESC`, `start_time ASC nulls last`, `sort_order ASC`. Client-side sort in `rowsByDay` useMemo already correct — was a data issue.
- **Timezone data quality fix** — SQL UPDATE assigned `start_timezone` to all seeded rows with `NULL` timezone, using `itinerary_days.location` to map city → IANA timezone. 0 null rows remaining for timed items.
- **`handleSaveRow` validation added** — title required; start fields all-or-nothing; end fields all-or-nothing; end must be after start; end without start blocked.
- **Category always enabled** — removed `disabled={rowForm.is_all_day}` from Category select. All-day and category are independent.
- **Border longhand fix** — delete confirmation Buttons in ItineraryClient updated from `borderColor` → four explicit `borderTop/Right/Bottom/Left` longhands to match Button.tsx's base style pattern.
- **Sign Out button** — added to `DashboardView.tsx` header after + New Trip button. Uses `@/lib/supabase/client`, calls `supabase.auth.signOut()`, redirects to `/auth/login`. Visible on all screen sizes.
- **line-clamp-3 applied** — `FlightsClient.tsx` f.notes, `ItineraryClient.tsx` row.description. → `00.01.0068` (not yet pushed)
- **`confirmDelete` split** — in progress with AI2 at session end. Splitting single `confirmDelete` into `confirmDeleteDay` + `confirmDeleteRow`. Verify completion before pushing.
- **Pushed `00.01.0067`** — production verified ✅

---

## Key Technical Notes

### Itinerary Schema
- `itinerary_days` columns: `id, trip_id, day_date, day_number, title, location, notes, sort_order, created_at, deleted_at, type`
- `itinerary_rows` columns: `id, day_id, trip_id, start_time, end_time, title, description, location, category, sort_order, created_at, deleted_at, start_timezone, end_timezone, is_all_day, is_approx, is_provided, action_required, action_note`
- Days sort by `day_date`. Rows sort: all-day first, then `start_time` ASC nulls last, then `sort_order`.
- `day_number === 0` renders as "PRE-TRIP".
- Day types: `flight` ✈️, `train` 🚂, `free` 🌄, `transit` 🚌, `sightseeing` 🗺️
- Day card uses `.day-card` CSS class — do NOT add inline `background` or hover will break.
- `section-row` class NOT used on day cards — use explicit inline styles + `.day-card` only.
- `end_timezone` falls back to `start_timezone` for display and UTC conversion when not set.
- Stage 3 not yet started: line-clamp on row descriptions ✅ done, category as `<select>` ✅ done, `confirmDelete` fix ⏳ in progress.

### Responsive Architecture
- **Layout breakpoints (width-based):** 900px = single column, actions visible; 480px = further layout changes.
- **Type scale (pointer-based):** iPad tier ≥768px touch; iPhone tier <768px touch. Mac always gets base CSS sizes.
- **ResponsiveSheet:** renders `Modal` on ≥900px, `BottomSheet` on <900px.
- **content-container:** max-width 960px, centered. Header/hero/tab bar remain at 1200px.
- **timing-grid:** CSS class in globals.css — 1-col default, 3-col at ≥900px. Used in Itinerary Row Sheet for Start and End time groups.

### General
- Trip date range (`departure_date`, `return_date`) from `trips` table passed as props to constrain date pickers.
- TRIP_CITIES timezone map: Honolulu=`Pacific/Honolulu`, Vancouver/Kamloops=`America/Vancouver`, Jasper/Lake Louise/Banff=`America/Edmonton`.
- API routes: service role client for data, SSR client for auth only.
- Form fields must always initialize to `''` not `null` for controlled inputs.
- Payload to API must explicitly list only valid DB columns — never spread the whole form object.
- **TypeScript strictness**: production build catches type errors dev mode ignores. Watch Vercel build logs after any props/interface changes.
- **Magic link redirect**: `process.env.NEXT_PUBLIC_SITE_URL` + `/auth/callback` in both `LoginForm.tsx` and `CreateAccountForm.tsx`.
- **Supabase client import**: `@/lib/supabase/client` (not `@/utils/supabase/client`).
- **3x5 print architecture**: html2canvas → jsPDF. Right padding `0.50in` validated — do not reduce. Option B (content-aware splitting) deferred.
- **Claude Code confirmed as AI2**: Opus 4.6, included in Pro plan. Version bumps done by Claude Code; git push done by Stan.
- **Border pattern**: Button.tsx uses `borderTop/Right/Bottom/Left` longhands (not `border` shorthand, not `borderColor`). All callers must match this pattern.

### Overview Section (Next Session)
- New section to precede all others in the trip detail view.
- Modelled on CAN26 Overview — similar layout and content.
- Review CAN26 index.html Overview section before designing.
