# Helm Handoff — Apr 15

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
`00.01.0084` — localhost verified, build passes clean ✅ — **not yet pushed**

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
| Itinerary | ✅ Stages 1–3 complete + typography pass | 00.01.0084 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. Blocks multi-browser and multi-device testing. Workaround: stop `npm run dev` before logging into production | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Auth email | Supabase email template still says "Magic Link" / "Your Magic Link" — fix manually in Supabase Dashboard → Authentication → Email Templates. Suggested: subject "Your Helm sign-in link", body heading "Sign In to Helm" | Dashboard fix, no code |
| 4 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate to Key Info tab and scroll to item. Currently always navigates internally | Future enhancement |
| 5 | Overview layout | Two-column layout may feel squeezed if font sizes are bumped further. Options: raise breakpoint to ≥1100px, restructure left column, or go single-column always. Deferred until after mobile review. | Future |
| 6 | Itinerary row typography | Further refinement possible (location line, notes styling). Stan happy with current state but flagged as potentially revisitable. | Future / optional |

---

## Next Session
1. **Push `00.01.0084`** — nothing blocking
2. **Mobile platform review** — systematic pass on iPad and iPhone (especially iPhone)
3. **HST removal** — separate pass, touches many sections (long-deferred)
4. **Overview font/layout pass** — deferred until after mobile review

---

## Session Transaction Log

### Apr 14b (previous session)
- See previous handoff (Helm_Handoff_Apr14b.md).

### Apr 15 (this session)

**Starting version:** `00.01.0081` (not yet pushed at session start — pushed during this session)

**Pushed:**
- `00.01.0081` pushed to production at session start — nothing was blocking.

**Context established:**
- Handoff reviewed. Next tasks confirmed: push 0081, text size audit, mobile platform review, HST removal.

**Build 00.01.0082 — Font size audit Pass 1:**
- Conducted full font-size comparison between Helm and CAN26 (CAN26 source file reviewed directly).
- CAN26 key finding: dominant body size is 13px desktop, bumped to 14–16px on touch tiers via pointer media queries. Stat numbers are 40px (Cormorant).
- Helm key finding: body is 15px base, but no touch-tier content bumps. Stat numbers were 28px. FormField labels were 12px. Font sizes entirely hardcoded inline — no CSS tokens.
- Three changes shipped:
  - `OverviewClient.tsx`: stat number 28px → 40px
  - `globals.css`: 7 content font-size rules added to both iPad and iPhone touch-tier blocks (key-info-label, key-info-value, key-info-link, pack-item-text, pack-cat-name, pack-group-name, key-info-group-header)
  - `FormField.tsx`: label/asterisk/help/error text 12px → 13px (inputStyle 16px preserved)
- Note: `.pack-cat-name` not yet defined in globals.css — rule is forward-looking.

**Design analysis — Itinerary hierarchy:**
- Compared Helm and CAN26 itinerary day cards via screenshots.
- Root cause identified: Helm's hierarchy was inverted — day title (Cormorant 22px) was dominant, date was secondary. CAN26 leads with the date as the serif anchor.
- Decision: swap hierarchy so date becomes dominant Cormorant element, title becomes supporting sans-serif.

**Build 00.01.0083 — Itinerary day card hierarchy:**
- `formatDayDate` helper: options changed to `{ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }`. Output: "Sat, Oct 3, 2026".
- Date element: promoted to Cormorant Garamond 22px, weight 600, navy.
- Day title: demoted to 15px, weight 400, var(--text2).
- Card vertical padding: 16px → 20px top/bottom.
- AI2 note: converted date wrapper from `<span>` to `<div>` to avoid invalid HTML nesting.

**Build 00.01.0084 — Itinerary activity row typography:**
- Activity row font sizes bumped throughout:
  - "All Day" label: 12px → 14px
  - Normal time: 12px → 14px
  - HST fallback: 11px → 12px
  - Row title: 14px → 15px
  - Row description: 13px → 14px, color var(--text3) → var(--text2)
  - Row container padding: 14px 16px → 18px 16px (inline + globals.css `.section-row`)

**Session close note:**
- Stan discovered mid-session that his CAN26 browser tab had been zoomed, making the comparison inaccurate. Changes made are still good design improvements regardless. Further size revisiting deferred to a future session.

---

## Key Technical Notes

### Font Size Architecture
- Helm uses **inline `fontSize` styles** throughout all section components — there are no Tailwind `text-*` classes in use.
- `globals.css` touch-tier media queries only reach elements using CSS class names (packing, key info). Inline-style components (Checklist, Itinerary, Flights, Hotels, etc.) require per-component edits for touch bumps.
- `body` font-size: 15px. `html` has no font-size set.
- No CSS custom properties for font sizes — all values are hardcoded at each usage site.
- **CSS token warning:** `var(--surface)` is NOT defined in `globals.css` — do not use. Always verify new CSS tokens exist before specifying them in build instructions.

### Itinerary Day Card Typography (post 00.01.0083–0084)
- Date: Cormorant Garamond, 22px, weight 600, var(--navy) — dominant anchor element
- Day title: sans-serif, 15px, weight 400, var(--text2) — supporting element
- Day number: Cormorant, 36px, faint decorative — unchanged
- Activity row time: 14px, weight 700, var(--gold-text)
- Activity row title: 15px, weight 700, var(--text)
- Activity row description: 14px, var(--text2), line-height 1.5
- Activity row padding: 18px 16px

### Tab Bar Scroll Arrows
- Wrapper div: `position: 'relative'` containing `helm-tab-row` + 4 always-rendered overlays
- State: `canScrollLeft`, `canScrollRight` (both `useState`); `tabRowRef` (`useRef<HTMLDivElement>`)
- `updateScrollState`: reads `scrollLeft`, `clientWidth`, `scrollWidth` from ref
- Mount: `setTimeout(updateScrollState, 50)` + `resize` listener in single `useEffect`
- Arrows: `position: absolute`, `width: 44px`, `fontSize: 34px`, `fontWeight: 700`, `background: var(--bg)`, `opacity`/`pointerEvents` toggled by state
- Fades: `position: absolute`, `width: 24px`, `linear-gradient` from `var(--bg)` to `transparent`, `pointerEvents: none`, `opacity` toggled by state
- **Important:** `var(--surface)` is NOT defined in `globals.css` — do not use. Use `var(--bg)` for the tab row background color.

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
- Stat numbers: 40px Cormorant Garamond (bumped from 28px in 00.01.0082)

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
