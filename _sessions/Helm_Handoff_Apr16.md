# Helm Handoff — Apr 16

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
`00.01.0084` — pushed to production ✅

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
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. Still capped; now inconvenient for multi-device only, not for dev-vs-prod (localhost magic link auth fixed Apr 16). | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate to Key Info tab and scroll to item. Currently always navigates internally | Future enhancement |
| 4 | Itinerary row typography | Further refinement possible (location line, notes styling). Stan happy with current state but flagged as potentially revisitable. | Future / optional |

**Closed this session:**
- Localhost dev environment (fixed — Site URL + port reassignment for TODOS)
- Magic Link email template wording (fixed for both apps in Supabase dashboards)
- Overview font/layout pass (in good shape, no further work needed)
- Overview layout squeeze concern (in good shape)

---

## Next Session
1. **Mobile platform review** — systematic pass on iPad and iPhone (especially iPhone). Needs criteria defined before starting.
2. **Google Calendar integration (design session)** — replaces deferred HST removal task. Concept: store all events in their local timezone, push CRUD to Google Calendar, let the calendar client handle timezone display math natively. Scope questions to resolve before build:
   - Does Helm still show HST at all, or just local time (deferring dual-timezone display to Google Calendar)?
   - Does Calendar integration replace Helm's itinerary view, supplement it, or export only?
   - Direction of sync: Helm → Google Calendar only, or bidirectional?
   - Which Google account and which calendar (personal, dedicated trip calendar, shared with Cathy)?
   - Which sections sync events: Itinerary only, or also Flights/Hotels/Transportation/Restaurants?
3. **Multi-vendor AI architecture (deferred planning)** — see `Multi_Vendor_AI_Architecture_Archive.md`. Revisit when Helm reaches CAN26 parity.

---

## Session Transaction Log

### Apr 15 (previous session)
- See previous handoff (Helm_Handoff_Apr15.md). 00.01.0082–0084 typography and itinerary hierarchy work.

### Apr 16 (this session)

**Starting version:** `00.01.0084` (localhost-verified, not yet pushed at session start)

**Infrastructure work — localhost magic link auth:**
- Root cause of persistent "magic link redirects to localhost" bug identified: Supabase Site URL configuration, not code.
- **Port reassignment:** TODOS moved from port 3000 to port 3001 to allow Helm and TODOS dev servers to run simultaneously. `package.json` `dev` script updated: `"next dev -p 3001"`.
- **Helm Supabase config (verified):** Site URL = `https://helm-gilt.vercel.app`; redirect URLs = `http://localhost:3000/**` and `https://helm-gilt.vercel.app/**` (narrow `/auth/callback` entry widened to `/**` wildcard).
- **TODOS Supabase config (verified):** Site URL = `https://todos-eight-lake.vercel.app`; redirect URLs = `http://localhost:3001/**` and `https://todos-eight-lake.vercel.app/**`.
- All four verification tests passed: both dev servers run simultaneously, Vercel magic links redirect to Vercel, localhost magic links redirect to localhost, for both apps.

**Magic Link email wording:**
- Supabase email templates updated for both Helm and TODOS (dashboard fix, no code). Stan handled directly. Closed.

**Architecture discussion — multi-vendor AI workforce (deferred):**
- Original question "give Claude read access to TODOS backlog" expanded into a broader architecture discussion about supporting multiple AI vendors (Claude, Perplexity, Gemini) working across projects.
- Decisions locked in during discussion: Claude gets read + write with confirmation; tool-based access (initially); migrate existing handoff TODOs to TODOS app when work resumes.
- Reframe: MCP-only solution favors Claude; the right abstraction is a standard HTTP API as source of truth with vendor-specific adapters on top.
- Full shared state map produced across six categories (backlog, codebase, session continuity, databases, secrets, rules).
- Recommended sequencing when work resumes: project rules document first (highest leverage, lowest effort), then TODOS API audit, then MCP wrapper for Claude, then multi-vendor access guide, then migration of handoff TODOs.
- Work deferred until Helm reaches CAN26 parity. Full discussion archived to `Multi_Vendor_AI_Architecture_Archive.md`.

**TODO triage and close-outs:**
- Apr 15 handoff TODOs reviewed. Overview font/layout pass closed (in good shape). Overview layout squeeze concern closed. HST removal reframed into Google Calendar integration (to be designed separately). Auth workaround rescoped (still capped at 1, now inconvenient for multi-device only).

**Push:**
- `00.01.0084` pushed to production with commit message "v00.01.0084 - typography and itinerary refinements".

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
- Future: if item has URL, open externally; if not, navigate internally (Open Issue #3)

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

### Magic Link Auth Configuration (verified working Apr 16)
- Site URL (Supabase): `https://helm-gilt.vercel.app` — critical fallback redirect target
- Redirect URL allowlist: `http://localhost:3000/**` and `https://helm-gilt.vercel.app/**` (both use `/**` wildcard)
- Code redirect: `process.env.NEXT_PUBLIC_SITE_URL` + `/auth/callback` in both `LoginForm.tsx` and `CreateAccountForm.tsx`
- Max sessions per user: capped at 1 (Pro plan required to change — deferred)

### General (unchanged)
- Trip date range (`departure_date`, `return_date`) from `trips` table passed as props to constrain date pickers.
- TRIP_CITIES timezone map: Honolulu=`Pacific/Honolulu`, Vancouver/Kamloops=`America/Vancouver`, Jasper/Lake Louise/Banff=`America/Edmonton`.
- API routes: service role client for data, SSR client for auth only.
- Form fields must always initialize to `''` not `null` for controlled inputs.
- Payload to API must explicitly list only valid DB columns — never spread the whole form object.
- **TypeScript strictness**: production build catches type errors dev mode ignores. Watch Vercel build logs after any props/interface changes.
- **Supabase client import**: `@/lib/supabase/client` (not `@/utils/supabase/client`).
- **3x5 print architecture**: html2canvas → jsPDF. Right padding `0.50in` validated — do not reduce. Option B (content-aware splitting) deferred.
- **Claude Code confirmed as AI2**: Opus 4.6, included in Pro plan. Version bumps done by Claude Code; git push done by Stan.
- **Border pattern**: Button.tsx uses `borderTop/Right/Bottom/Left` longhands (not `border` shorthand, not `borderColor`). All callers must match this pattern.
- **File paths**: ChecklistClient and KeyInfoClient are at `components/sections/` not `components/trips/`. Only OverviewClient is under `components/trips/overview/`.
