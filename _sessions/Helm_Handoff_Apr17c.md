# Helm Handoff — Apr 17c

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
`00.01.0096` — local only, not yet pushed to production

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
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. Still capped; now inconvenient for multi-device only. | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate to Key Info tab and scroll to item. Currently always navigates internally | Future enhancement |
| 4 | Itinerary row typography | Further refinement possible. Stan happy with current state but flagged as potentially revisitable. | Future / optional |
| 5 | Mobile review | Full mobile review pass (iPad + iPhone in Comet) — paused pending iPad login confirmation | Resume after iPad login confirmed |

---

## Next Session
**START HERE: Confirm iPad magic link, then git push, then resume mobile review**

1. **Confirm iPad magic link** — Supabase email rate limit hit at end of Apr 17c session. Wait ~1 hour from end of session before retrying. Then test login via `http://192.168.86.90:3000` on iPad in Comet.
   - Fresh magic link email should show `redirect_to=http://192.168.86.90:3000` (not Vercel URL)
   - Console log `[LoginForm] emailRedirectTo:` should print `http://192.168.86.90:3000/auth/callback`
   - A temporary diagnostic `console.log` is in `LoginForm.tsx` at line 81 — **remove it once login is confirmed working**

2. **Git push** — `00.01.0084` through `00.01.0096` accumulated. Push to production once iPad login is confirmed. Remove the diagnostic log before pushing.

3. **Resume mobile review** — systematic pass on iPad and iPhone (Comet). Criteria locked:
   - Scope: all sections
   - Devices: iPhone 14 Pro + iPad (Comet)
   - Bar: hard breaks + polish issues
   - North star: legibility for aging eyes
   - Fix as we find them, section by section
   - **Resume at Overview** (tab bar already approved, no changes needed)
   - Font size adjustments are a single-line change in globals.css (token architecture complete)

4. **Google Calendar integration (design session)** — after mobile review complete

5. **Multi-vendor AI architecture** — deferred until Helm reaches CAN26 parity

---

## Session Transaction Log

### Apr 15
- See Helm_Handoff_Apr15.md.

### Apr 16
- See Helm_Handoff_Apr16.md. Localhost magic link auth fixed. 00.01.0084 pushed to production.

### Apr 17a
- Planning only. Mobile review criteria defined. CSS token refactor approved. No code changes.

### Apr 17b
- CSS Token Refactor — 10 passes, all sections. Full token set defined. Mobile dev access setup. Magic link dynamic redirect implemented (`window.location.origin`). `http://192.168.86.90:3000/**` added to Supabase allowlist for Helm. Version `00.01.0095`.

### Apr 17c (this session)

**Starting version:** `00.01.0095`

**Auth callback origin fix (00.01.0096):**
- `app/auth/callback/route.ts` updated: both `Response.redirect` calls now use `request.nextUrl.origin` instead of `getURL()`
- `getURL` import removed from route.ts
- Root cause: callback was always redirecting to production URL regardless of where the request originated

**iPad login investigation:**
- Hydration errors in Comet confirmed as browser extension noise (`__gchrome_*` attributes) — not a code issue
- Magic link emails still showed `redirect_to=https://helm-gilt.vercel.app` despite `window.location.origin` fix in LoginForm.tsx
- Root cause found: Helm Supabase project was missing `http://192.168.86.90:3000/**` from Redirect URL allowlist — added manually by Stan
- Temporary diagnostic `console.log` added to `LoginForm.tsx` line 81 to confirm `emailRedirectTo` value at runtime
- Could not confirm fix — Supabase email rate limit hit before fresh test email could be sent
- **Status: unconfirmed — retry first thing next session**

---

## Key Technical Notes

### iPad Login — Current State (post 00.01.0096)
- `LoginForm.tsx`: uses `window.location.origin` for `emailRedirectTo` ✅
- `route.ts` (auth callback): uses `request.nextUrl.origin` for both redirects ✅
- Supabase Helm project Redirect URL allowlist: `http://localhost:3000/**`, `https://helm-gilt.vercel.app/**`, `http://192.168.86.90:3000/**` ✅
- Temporary diagnostic log at `LoginForm.tsx:81` — **remove before git push**

### CSS Token Architecture (post 00.01.0094)
- All font sizes now use CSS custom properties (`--fs-*`) — single-line change in `:root` propagates everywhere
- All font weights now use `--fw-*` tokens
- Spacing tokens `--sp-*` defined but not yet migrated to components (available for future use)
- `body` font-size: `var(--fs-base)` = 16px (bumped from 15px)
- Touch targets: `var(--touch-target)` = 48px
- Semantic color tokens: `--link`, `--link-hover`

### CSS Token Set (full)
```css
--fs-xs: 12px
--fs-sm: 14px
--fs-base: 16px
--fs-md: 17px
--fs-lg: 20px
--fs-xl: 24px
--fs-2xl: 28px
--fs-display: 36px
--fs-stat: 40px
--fw-normal: 400
--fw-medium: 600
--fw-bold: 700
--sp-xs: 4px
--sp-sm: 8px
--sp-md: 12px
--sp-lg: 16px
--sp-xl: 20px
--sp-2xl: 24px
--touch-target: 48px
--link: var(--gold-text)
--link-hover: var(--gold)
```

### CSS Token Warning
- `var(--surface)` is NOT defined in `globals.css` — do not use.
- Use `var(--bg)` for tab row background color.

### Font Size Architecture (current state)
- globals.css class-based rules: fully tokenized
- All section client components: fully tokenized (inline styles use var() references)
- To adjust all font sizes globally: edit token values in `:root` in globals.css only

### Itinerary Day Card Typography (post 00.01.0083–0084, now tokenized)
- Date: Cormorant Garamond, var(--fs-xl), weight var(--fw-medium), var(--navy)
- Day title: sans-serif, var(--fs-base), weight var(--fw-normal), var(--text2)
- Day number: Cormorant, var(--fs-display), faint decorative
- Activity row time: var(--fs-sm), weight var(--fw-bold), var(--gold-text)
- Activity row title: var(--fs-base), weight var(--fw-bold), var(--text)
- Activity row description: var(--fs-sm), var(--text2), line-height 1.5

### Tab Bar Scroll Arrows
- Wrapper div: `position: 'relative'` containing `helm-tab-row` + 4 always-rendered overlays
- State: `canScrollLeft`, `canScrollRight` (both `useState`); `tabRowRef` (`useRef<HTMLDivElement>`)
- Use `var(--bg)` for background color — `var(--surface)` does not exist

### TabNavigationContext
- Exported from `components/advisor/TripDetailView.tsx`
- Shape: `{ navigateTo: (tab: string, itemId?: string) => void; pendingItemId: string | null; clearPendingItem: () => void }`

### Scroll-to-item Pattern
- Each navigable list item has `id={`item-${record.id}`}` on its root DOM element
- Highlight class: `.item-highlight` in `globals.css` — gold fade 1.5s

### Attention Required Strip
- Pulls `action_required = true` from: `checklist` (excludes completed), `itinerary_rows`, `key_info`

### Key Info Show in Overview
- Column: `show_in_overview` (boolean)
- Future: if item has URL, open externally; if not, navigate internally (Open Issue #3)

### Overview Layout
- Left column: Stats grid → Attention Required strip → Key Info strip
- Right column: Trip Timeline
- Two-column at ≥900px, single column below
- Days to Go card: gold background `var(--gold)`, navy text
- Stat numbers: var(--fs-stat) = 40px Cormorant Garamond

### Magic Link Auth Configuration
- Site URL (Supabase): `https://helm-gilt.vercel.app`
- Redirect URL allowlist: `http://localhost:3000/**`, `https://helm-gilt.vercel.app/**`, `http://192.168.86.90:3000/**`
- Code redirect: `window.location.origin` + `/auth/callback` (dynamic)
- Callback route redirect: `request.nextUrl.origin` (dynamic)
- Max sessions per user: capped at 1 (Pro plan required — deferred)

### Local Network Dev Access
- Mac IP: `192.168.86.90`
- iPad/iPhone access: `http://192.168.86.90:3000` in Comet
- `next.config.js`: `allowedDevOrigins: ['192.168.86.90']`
- `package.json`: `"dev": "next dev -p 3000 -H 0.0.0.0"`

### Checklist Table
- Active table: `checklist` (not `checklist_items` — dropped)
- Columns include: `task`, `group_name`, `action_required`, `action_note`, `status`, `due_date`, `ref`, `resolution`, `notes`, `sort_order`, `item_number`

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
- **Border pattern**: Button.tsx uses `borderTop/Right/Bottom/Left` longhands. All callers must match.
- **File paths**: ChecklistClient and KeyInfoClient at `components/sections/`. Only OverviewClient under `components/trips/overview/`.
- **TODOS dev port**: 3001. Helm dev port: 3000.
