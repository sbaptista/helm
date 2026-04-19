# Helm Handoff — Apr 12b

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
`00.01.0070` — localhost verified, build passes clean ✅ — **not yet pushed**

Includes: Overview visual fixes (two-column layout, checklist total count, tab navigation, urgent header, hover effect). Further cleanup still needed — see Open Issues.

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | ✅ Built, cleanup still needed before push | 00.01.0070 |
| Checklist | ✅ Functional | 00.01.0050 |
| Packing | ✅ Functional | 00.01.0050 |
| Key Info | ✅ Functional (Gold Standard CRUD) | 00.01.0054 |
| Transportation | ✅ Functional + section-row styling | 00.01.0058 |
| Hotels | ✅ Functional + section-row styling | 00.01.0058 |
| Flights | ✅ Functional + line-clamp on notes | 00.01.0068 |
| Restaurants | ✅ Functional + section-row styling | 00.01.0058 |
| Itinerary | ✅ Stages 1–3 complete | 00.01.0068 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. Workaround: stop `npm run dev` before logging into production | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Overview | Further visual cleanup needed — Stan to enumerate at next session start | 🔴 Next session |
| 4 | Key Info | Test data row "Testing, Testing..." has `flag = true` — SQL fix ready to run | 🔴 Pending SQL |

**SQL for Issue 4 (Stan runs in Supabase SQL Editor):**
```sql
UPDATE key_info
SET flag = false
WHERE id = '27681bdd-0627-4f9a-81ef-6151792c94a5';
```

---

## Next Session
1. **Enumerate remaining Overview visual cleanup items** — Stan to list at session start
2. **Run Issue 4 SQL** if not already done
3. **Push `00.01.0070`** — after Overview cleanup verified on localhost
4. **Text size audit** — overall feeling that Helm text is smaller than CAN26; verify and bump if true
5. **Mobile platform review** — systematic pass on iPad and iPhone (especially iPhone)
6. **HST removal** — separate pass, touches many sections (long-deferred)

---

## Session Transaction Log

### Apr 11b (previous session)
- See previous handoff.

### Apr 12a (previous session)
- Confirmed complete from previous session: `confirmDelete` split into `confirmDeleteDay` / `confirmDeleteRow` ✅
- Confirmed pushed: `00.01.0068` — line-clamp (flights + itinerary), Sign Out button, confirmDelete fix ✅
- Designed Overview section — stats bar, urgent strip, trip timeline, booking ref strip
- AI2 completed Overview build → `00.01.0069`, build passes cleanly ✅
- Stan identified several visual fixes needed

### Apr 12b (this session)
- Stan enumerated 6 Overview visual issues
- AI1 diagnosed all 6 from source files (`route.ts`, `TripDetailView.tsx`, `OverviewClient.tsx`, `OverviewSection.tsx`)
- Issue 2 (checklist showing 0): confirmed root cause — `checklist_open` count only; fix adds `checklist_total` parallel query
- Issue 3 (links return to Overview): confirmed root cause — `<a href>` with no matching route; fix uses `router.push(?tab=)` + `useEffect` URL param reader in TripDetailView
- Issue 5 ("Testing, Testing..."): confirmed test data row in `key_info` with `flag = true`; SQL fix identified
- Wrote AI2 instructions → `overview_fixes.md`
- AI2 applied all 6 fixes → `00.01.0070`, build passes clean ✅
- Stan confirmed further cleanup still needed — to be enumerated next session
- SQL for "Testing, Testing..." row ready but not yet run by Stan

---

## Key Technical Notes

### Overview Section
- **New files:** `app/api/trips/[id]/overview/route.ts`, `components/sections/OverviewSection.tsx` (server, named export `OverviewSection`), `components/trips/overview/OverviewClient.tsx`
- **Modified:** `lib/version.ts`, `components/advisor/TripDetailView.tsx` (Overview first tab, default active; `useEffect` reads `?tab=` param on mount), `app/advisor/trips/[id]/page.tsx`, `app/globals.css` (`.overview-stats-grid`, `.overview-layout`, `.overview-col`, `.overview-stat-card`)
- **Urgent strip:** always renders — empty state shows "🔥 Urgent Items" header + "✅ Nothing urgent right now"; urgent state shows red left border + header + list
- **Stats bar:** 7 cards — Days to Go (non-navigating), Checklist (red when open > 0, shows **total** count), Flights, Hotels, Transfers, Restaurants, Packing. All except Days to Go use `router.push(?tab=TabName)`.
- **Tab navigation from Overview:** stat cards and timeline rows use `router.push(/advisor/trips/[id]?tab=TabName)`; TripDetailView reads `?tab=` on mount via `useEffect` and sets `activeTab`
- **Layout:** `.overview-layout` = 2-col grid at ≥900px (left: stats+urgent, right: timeline+booking ref), 1-col below
- **Timeline:** rows navigate to Itinerary tab; dot colors by type; PRE-TRIP label for `day_number === 0`
- **Booking ref strip:** hidden when no `flag = true` key info items
- **Days Until Departure:** computed at render from `trips.departure_date`; shows "Today" / "Underway" for 0 / negative values
- **Checklist stat:** shows `checklist_total` (all items); red alert when `checklist_open > 0`

### Itinerary Schema
- `itinerary_days` columns: `id, trip_id, day_date, day_number, title, location, notes, sort_order, created_at, deleted_at, type`
- `itinerary_rows` columns: `id, day_id, trip_id, start_time, end_time, title, description, location, category, sort_order, created_at, deleted_at, start_timezone, end_timezone, is_all_day, is_approx, is_provided, action_required, action_note`
- Days sort by `day_date`. Rows sort: all-day first, then `start_time` ASC nulls last, then `sort_order`.
- `day_number === 0` renders as "PRE-TRIP".
- Day types: `flight` ✈️, `train` 🚂, `free` 🌄, `transit` 🚌, `sightseeing` 🗺️

### Responsive Architecture
- **Layout breakpoints (width-based):** 900px = single column, actions visible; 480px = further layout changes.
- **Type scale (pointer-based):** iPad tier ≥768px touch; iPhone tier <768px touch. Mac always gets base CSS sizes.
- **ResponsiveSheet:** renders `Modal` on ≥900px, `BottomSheet` on <900px.
- **content-container:** max-width 960px, centered. Header/hero/tab bar remain at 1200px.
- **timing-grid:** CSS class in globals.css — 1-col default, 3-col at ≥900px.

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
