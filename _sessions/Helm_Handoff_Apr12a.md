# Helm Handoff — Apr 12a

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
`00.01.0069` — localhost verified ✅ — **not yet pushed**

Includes: Overview section (stats bar, urgent strip, trip timeline, booking ref strip). Build passes cleanly. Several visual fixes needed before push — see Open Issues.

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | ✅ Built, fixes needed before push | 00.01.0069 |
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
| 3 | Auth | Magic link redirect fix — `NEXT_PUBLIC_SITE_URL` in LoginForm + CreateAccountForm | ✅ Closed (00.01.0066) |
| 4 | Overview | Several visual fixes identified by Stan — to be itemized at start of next session | 🔴 Next session |

---

## Next Session
1. **Review and fix Overview visual issues** — Stan to enumerate at session start
2. **Push `00.01.0069`** — after Overview fixes verified on localhost
3. **Text size audit** — overall feeling that Helm text is smaller than CAN26; verify and bump if true
4. **Mobile platform review** — systematic pass on iPad and iPhone (especially iPhone)
5. **HST removal** — separate pass, touches many sections (long-deferred)

---

## Session Transaction Log

### Apr 11b (previous session)
- See previous handoff.

### Apr 12a (this session)
- Confirmed complete from previous session: `confirmDelete` split into `confirmDeleteDay` / `confirmDeleteRow` ✅
- Confirmed pushed: `00.01.0068` — line-clamp (flights + itinerary), Sign Out button, confirmDelete fix ✅
- Queried `information_schema.columns` for `checklist` — `urgent boolean DEFAULT false` confirmed ✅
- Queried `information_schema.columns` for `trips` and `key_info` — `departure_date` on `trips` confirmed; `key_info` uses label/value pattern with `flag boolean` ✅
- Designed Overview section — stats bar, urgent strip, trip timeline, booking ref strip
- Wrote AI2 instructions → `overview_instructions.md`
- Issued patch: Urgent strip always renders — "✅ Nothing urgent right now" when empty, red border + list when urgent items exist → `overview_patch_1.md`
- AI2 completed Overview build → `00.01.0069`, build passes cleanly ✅
- Stan identified several visual fixes needed — to be enumerated next session before push

---

## Key Technical Notes

### Overview Section
- **New files:** `app/api/trips/[id]/overview/route.ts`, `components/sections/OverviewSection.tsx` (server, named export `OverviewSection`), `components/trips/overview/OverviewClient.tsx`
- **Modified:** `lib/version.ts`, `components/advisor/TripDetailView.tsx` (Overview first tab, default active), `app/advisor/trips/[id]/page.tsx`, `app/globals.css` (`.overview-stats-grid`)
- **Urgent strip:** always renders — empty state shows "✅ Nothing urgent right now" with no red border; urgent state shows red left border + 🔥 Urgent Items title + list
- **Stats bar:** 7 cards — Days to Go (non-navigating), Checklist (red when open > 0), Flights, Hotels, Transfers, Restaurants, Packing. All except Days to Go are `<a href>` links.
- **Timeline:** rows link to `/trips/[id]/itinerary?day=[day.id]`; dot colors by type; PRE-TRIP label for `day_number === 0`
- **Booking ref strip:** hidden when no `flag = true` key info items
- **Days Until Departure:** computed at render from `trips.departure_date`; shows "Today" / "Underway" for 0 / negative values

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
