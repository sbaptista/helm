# Helm Handoff — Apr 14

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
`00.01.0074` — localhost verified, build passes clean ✅ — **not yet pushed**

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | ✅ Fully functional | 00.01.0074 |
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

---

## Next Session
1. **Push `00.01.0074`** — nothing blocking
2. **Text size audit** — overall feeling that Helm text is smaller than CAN26; verify and bump if true
3. **Mobile platform review** — systematic pass on iPad and iPhone (especially iPhone)
4. **HST removal** — separate pass, touches many sections (long-deferred)

---

## Session Transaction Log

### Apr 12b (previous session)
- See previous handoff.

### Apr 14 (this session)

**Workflow / tooling:**
- Discussed Claude desktop app and whether AI instances can communicate directly — confirmed they cannot; memory system provides orientation but not live cross-session access
- Confirmed that AI1 can now fetch pushed files directly from GitHub via `web_fetch`; local (unpushed) files still require upload from Stan
- Established that full handoff will continue to be generated each session despite memory system

**Schema changes (all run in Supabase SQL Editor):**
- Dropped legacy tables `checklist_items` and `checklist_reminders` (CASCADE)
- `checklist`: renamed `urgent` → `action_required`; added `action_note text`
- `key_info`: renamed `flag` → `show_in_overview`; added `action_required boolean default false`; added `action_note text`
- Fixed stale test row: `UPDATE key_info SET show_in_overview = false WHERE id = '27681bdd-...'`

**Build 00.01.0071 — Overview batch fixes:**
- Fixed tab navigation from Overview stat cards (was broken — `useEffect` with `[]` didn't re-fire on client-side navigation). Fix: exported `TabNavigationContext` from `TripDetailView`; stat cards and timeline rows call `navigateTo()` from context instead of `router.push()`
- Days to Go card visually differentiated as non-clickable (muted background, no hover)
- Attention Required strip replaces Urgent Items strip — cross-section (Checklist + Itinerary + Key Info), with source label and `action_note` per item
- Key Info form: `flag` → `show_in_overview` checkbox; added `action_required` checkbox + conditional `action_note` textarea
- Checklist form: `urgent` → `action_required`; added `action_note` textarea; filter label updated; badge updated
- `OverviewSection.tsx`: fixed `checklist_items` → `checklist` throughout; added three parallel `action_required` queries; unified `attentionRequired` array
- `overview/route.ts`: same table/column renames applied (not active code path but kept consistent)
- `globals.css`: added `.badge-show-in-overview` class

**Build 00.01.0072 — Scroll-to-item navigation:**
- Extended `TabNavigationContext` with `pendingItemId` and `clearPendingItem`
- Attention Required strip items now pass `item.id` to `navigateTo()`
- Checklist, KeyInfo, ItineraryClient: each reads `pendingItemId` from context, scrolls to matching element with 80ms delay, applies 1.5s gold highlight animation
- Itinerary: also expands the parent day before scrolling to a row
- Added `router.refresh()` after save in Checklist, KeyInfo, ItineraryClient (row saves only) to keep Overview strip fresh
- Removed `isAlert` from Checklist stat card (was always red; not meaningful)
- Added `@keyframes helm-item-highlight` + `.item-highlight` class to `globals.css`

**Build 00.01.0073 — Overview layout + timeline navigation:**
- Key Info (booking ref) strip moved from right column to left column, below Attention Required
- Added `🔑 Key Info` title to booking ref strip
- Timeline day clicks now navigate to Itinerary tab and scroll to + highlight the day card
- ItineraryClient `useEffect` updated to handle both rows (expand day + scroll) and days (scroll only)

**Build 00.01.0074 — Key Info strip indent fix:**
- Booking ref strip switched from horizontal `flex-wrap` to `flex-direction: column`; dot separators removed

---

## Key Technical Notes

### TabNavigationContext
- Exported from `components/advisor/TripDetailView.tsx`
- Shape: `{ navigateTo: (tab: string, itemId?: string) => void; pendingItemId: string | null; clearPendingItem: () => void }`
- All section clients that support scroll-to-item import and consume this context
- `navigateTo(tab)` — switches tab only; `navigateTo(tab, id)` — switches tab and sets pending item

### Scroll-to-item Pattern
- Each navigable list item has `id={`item-${record.id}`}` on its root DOM element
- `useEffect` watches `pendingItemId`; on match: clears pending, sets `highlightedId`, expands day if needed (Itinerary rows), `setTimeout 80ms` → `scrollIntoView`, `setTimeout 1500ms` → clears highlight
- Highlight class: `.item-highlight` in `globals.css` — `@keyframes helm-item-highlight` gold fade 1.5s
- If highlight not visible: add `!important` to keyframe `background-color` values
- Sections with scroll-to-item: ChecklistClient, KeyInfoClient, ItineraryClient (both rows and day cards)

### Attention Required Strip
- Pulls `action_required = true` from: `checklist` (excludes completed), `itinerary_rows`, `key_info`
- Each item shape: `{ id, source: 'Checklist' | 'Itinerary' | 'Key Info', label, action_note }`
- Clicking navigates to source tab AND scrolls to item
- Strip is in left Overview column; empty state shows "✅ Nothing requires attention right now"

### Key Info Show in Overview
- Column: `show_in_overview` (boolean) — previously `flag`
- Items with `show_in_overview = true` appear in the `🔑 Key Info` strip (left column, below Attention Required)
- Separate from `action_required` — booking refs always show; not always urgent

### Overview Section Architecture
- `OverviewSection.tsx` is a server component that queries Supabase directly (not via API route)
- `app/api/trips/[id]/overview/route.ts` exists but is not the active code path — kept in sync for consistency
- Server component re-renders on `router.refresh()` calls from client saves

### Checklist Table
- Active table: `checklist` (not `checklist_items` — that table has been dropped)
- `checklist_reminders` also dropped (was dependent on `checklist_items`)
- Columns include: `task`, `group_name`, `action_required`, `action_note`, `status`, `urgent` (renamed), `due_date`, `ref`, `resolution`, `notes`, `sort_order`, `item_number`

### Overview Layout
- Left column: Stats grid → Attention Required strip → Key Info strip
- Right column: Trip Timeline (alone)
- Two-column at ≥900px, single column below

### General (unchanged)
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
- **File paths**: ChecklistClient and KeyInfoClient are at `components/sections/` not `components/trips/`. Only OverviewClient is under `components/trips/overview/`.
