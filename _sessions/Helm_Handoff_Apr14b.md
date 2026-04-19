# Helm Handoff — Apr 14b

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
`00.01.0081` — localhost verified, build passes clean ✅ — **not yet pushed**

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | ✅ Fully functional | 00.01.0081 |
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
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. Blocks multi-browser and multi-device testing. Workaround: stop `npm run dev` before logging into production | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Auth email | Supabase email template still says "Magic Link" / "Your Magic Link" — fix manually in Supabase Dashboard → Authentication → Email Templates. Suggested: subject "Your Helm sign-in link", body heading "Sign In to Helm" | Dashboard fix, no code |
| 4 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate to Key Info tab and scroll to item. Currently always navigates internally | Future enhancement |

---

## Next Session
1. **Push `00.01.0081`** — nothing blocking
2. **Text size audit** — overall feeling that Helm text is smaller than CAN26; verify and bump if true
3. **Mobile platform review** — systematic pass on iPad and iPhone (especially iPhone)
4. **HST removal** — separate pass, touches many sections (long-deferred)

---

## Session Transaction Log

### Apr 14a (previous session)
- See previous handoff (Helm_Handoff_Apr14.md).

### Apr 14b (this session)

**Pushed:**
- `00.01.0074` pushed to production at session start — nothing was blocking.

**Database:**
- Deleted phantom checklist row `id = 496a2fe5...` (task: "Fubar", group: "BooBoo") — `action_required = true` but group didn't exist in `checklist_groups`, making it invisible in Checklist section while still appearing in Overview Attention Required strip.

**Build 00.01.0075 — Overview polish batch:**
- Tab bar: added `WebkitOverflowScrolling: 'touch'` (was the only missing scroll property)
- Attention Required strip: only the label is now underlined/clickable; action_note renders as plain text below; source badge non-clickable
- Key Info strip: replaced `<a href target="_blank">` anchors with `navigateTo('Key Info', item.id)` — now navigates internally to Key Info tab and scroll-highlights the item
- Days to Go card: resting background changed from `var(--bg3)` (same as hover) to `var(--border2)` — visually distinct, clearly non-interactive
- "Magic Link" → "sign-in link" in code comment in `LoginForm.tsx` (no visible UI string existed)

**Builds 00.01.0076–0081 — Tab bar scroll arrows (iterative):**
- 0076: Added left/right scroll arrows (44px tap target, `‹` `›`), fade gradients, `canScrollLeft`/`canScrollRight` state, `updateScrollState` handler, mount `useEffect`, `resize` listener. Arrows conditionally rendered.
- 0077: Deferred mount `updateScrollState` by 50ms; added `resize` event listener. Arrows still not visible.
- 0078: Changed conditional render to always-render with `opacity`/`pointerEvents` toggle. Still not visible.
- 0079: **Root cause found** — `var(--surface)` used in 0076 spec is not defined in `globals.css`. Arrow buttons were transparent; fade gradients were `transparent → transparent`. Fixed by replacing all 4 `var(--surface)` references with `var(--bg)`. Diagnostic `console.log` removed.
- 0080: Arrow `fontSize` increased from `18px` to `28px` + `fontWeight: 700` — too small visually.
- 0081: Arrow `fontSize` increased from `28px` to `34px` — declared working and correct.

**Magic link / multi-browser question (answered, no code):**
- Supabase magic link tokens are single-use and browser-agnostic — they open in whatever browser the OS routes the email click to. All apps using this technique work the same way. Multi-browser testing blocked by 1-session cap (Open Issue #1). The macOS "large left arrow" seen occasionally is the browser back gesture, not a Helm bug.

---

## Key Technical Notes

### Tab Bar Scroll Arrows
- Wrapper div: `position: 'relative'` containing `helm-tab-row` + 4 always-rendered overlays
- State: `canScrollLeft`, `canScrollRight` (both `useState`); `tabRowRef` (`useRef<HTMLDivElement>`)
- `updateScrollState`: reads `scrollLeft`, `clientWidth`, `scrollWidth` from ref
- Mount: `setTimeout(updateScrollState, 50)` + `resize` listener in single `useEffect`
- Arrows: `position: absolute`, `width: 44px`, `fontSize: 34px`, `fontWeight: 700`, `background: var(--bg)`, `opacity`/`pointerEvents` toggled by state
- Fades: `position: absolute`, `width: 24px`, `linear-gradient` from `var(--bg)` to `transparent`, `pointerEvents: none`, `opacity` toggled by state
- **Important:** `var(--surface)` is NOT defined in `globals.css` — do not use it. Use `var(--bg)` for the tab row background color.

### TabNavigationContext
- Exported from `components/advisor/TripDetailView.tsx`
- Shape: `{ navigateTo: (tab: string, itemId?: string) => void; pendingItemId: string | null; clearPendingItem: () => void }`
- All section clients that support scroll-to-item import and consume this context
- `navigateTo(tab)` — switches tab only; `navigateTo(tab, id)` — switches tab and sets pending item

### Scroll-to-item Pattern
- Each navigable list item has `id={`item-${record.id}`}` on its root DOM element
- `useEffect` watches `pendingItemId`; on match: clears pending, sets `highlightedId`, expands day if needed (Itinerary rows), `setTimeout 80ms` → `scrollIntoView`, `setTimeout 1500ms` → clears highlight
- Highlight class: `.item-highlight` in `globals.css` — `@keyframes helm-item-highlight` gold fade 1.5s
- Sections with scroll-to-item: ChecklistClient, KeyInfoClient, ItineraryClient (both rows and day cards)

### Attention Required Strip
- Pulls `action_required = true` from: `checklist` (excludes completed), `itinerary_rows`, `key_info`
- Each item shape: `{ id, source: 'Checklist' | 'Itinerary' | 'Key Info', label, action_note }`
- Only the label is clickable (underlined, triggers `navigateTo`); action_note is plain text below; source badge is non-clickable
- Strip is in left Overview column; empty state shows "✅ Nothing requires attention right now"

### Key Info Show in Overview
- Column: `show_in_overview` (boolean) — previously `flag`
- Items with `show_in_overview = true` appear in the `🔑 Key Info` strip (left column, below Attention Required)
- Strip items navigate internally via `navigateTo('Key Info', item.id)` — no external links in strip
- Future: if item has URL, open externally; if not, navigate internally (Open Issue #4)

### Overview Section Architecture
- `OverviewSection.tsx` is a server component that queries Supabase directly (not via API route)
- `app/api/trips/[id]/overview/route.ts` exists but is not the active code path — kept in sync for consistency
- Server component re-renders on `router.refresh()` calls from client saves

### Overview Layout
- Left column: Stats grid → Attention Required strip → Key Info strip
- Right column: Trip Timeline (alone)
- Two-column at ≥900px, single column below
- Days to Go card: resting background `var(--border2)` (non-interactive); clickable stat cards hover to `var(--bg3)`

### Checklist Table
- Active table: `checklist` (not `checklist_items` — dropped)
- `checklist_reminders` also dropped
- Columns include: `task`, `group_name`, `action_required`, `action_note`, `status`, `due_date`, `ref`, `resolution`, `notes`, `sort_order`, `item_number`

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
- **CSS token warning**: `var(--surface)` is NOT defined in `globals.css` — do not use. Always verify new CSS tokens exist before specifying them in build instructions.
