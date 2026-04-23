# Helm Handoff — Apr 17e

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
`00.01.0097` — local only, not yet pushed to production

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
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate internally | Future enhancement |
| 4 | Itinerary row typography | Further refinement possible. Stan happy with current state. | Future / optional |
| 5 | Mobile review | Full mobile review pass — blocked on iPad login | Blocked |
| 6 | iPad magic link | Supabase ignoring `emailRedirectTo` — always uses Site URL. Root cause suspected to be a Vercel service worker. | Active investigation |

---

## Next Session
**START HERE: Check for rogue service worker**

The most likely root cause of the magic link redirect problem is a **service worker registered from a previous Vercel session** that is intercepting outbound fetch requests and rewriting the origin. This would explain why every OTP request reaches Supabase with `referer: https://helm-gilt.vercel.app` regardless of browser, device, HTTP vs HTTPS, or correct client-side code.

**Step 1 — Check for service workers in Comet on Mac:**
- Navigate to `chrome://serviceworker-internals` in Comet's address bar
- Look for any entry referencing `helm-gilt.vercel.app`
- If found: click Unregister and clear it

**Step 2 — Check for service workers in Safari on Mac:**
- Open Web Inspector on `https://192.168.86.90:3000`
- Storage tab → Service Workers
- Unregister anything referencing Vercel

**Step 3 — Check on iPad (Comet and Safari):**
- Comet: `chrome://serviceworker-internals`
- Safari: Settings → Safari → Advanced → Website Data → search for `helm-gilt.vercel.app` and delete

**Step 4 — After clearing service workers:**
- Wait for email rate limit to reset (Supabase free tier: 3 emails/hour)
- Test magic link from `https://192.168.86.90:3000` on iPad
- Check `redirect_to` in the email

**If service worker is not the cause:**
- Enable Safari Web Inspector on Mac (Safari → Settings → Advanced → Show features for web developers)
- Open `https://192.168.86.90:3000` in Safari on Mac
- Network tab → capture the `/otp` request body to confirm whether `emailRedirectTo` is included in the payload

**Once iPad login is confirmed working:**
- Git push `00.01.0097` to production
- Resume mobile review (Overview first, then section by section)

---

## HTTPS / mkcert Setup (completed Apr 17d)

### What was done
- Homebrew installed on Mac
- mkcert installed via Homebrew
- Local CA installed: `mkcert -install`
- Certificate generated in Helm project root: `mkcert localhost 192.168.86.90`
  - Files: `localhost+1.pem`, `localhost+1-key.pem` (in project root, gitignored)
  - Expiry: 17 July 2028
- Root CA location: `/Users/stanleybaptista/Library/Application Support/mkcert/rootCA.pem`
- Root CA AirDropped and trusted on iPad ✅
- Root CA AirDropped and trusted on iPhone ✅
- `https://192.168.86.90:3000/**` added to Supabase Redirect URL allowlist ✅
- `package.json` dev script updated to serve HTTPS with cert/key files, bind to `0.0.0.0:3000`
- `next.config.js` `allowedDevOrigins` updated to include HTTPS origin
- `.env.local` `NEXT_PUBLIC_SITE_URL` updated to `https://192.168.86.90:3000`
- `LoginForm.tsx` cleaned up — no `alert()`, no `console.log`

### Known limitation
- Comet on Mac shows certificate warning for `https://192.168.86.90:3000` — mkcert CA not recognized by Chromium store despite `nss` being installed
- **Workaround: use Safari on Mac for local dev testing**
- Comet remains the browser for production (`helm-gilt.vercel.app`)

---

## Session Transaction Log

### Apr 15
- See Helm_Handoff_Apr15.md.

### Apr 16
- See Helm_Handoff_Apr16.md. Localhost magic link auth fixed. 00.01.0084 pushed to production.

### Apr 17a
- Planning only. Mobile review criteria defined. CSS token refactor approved. No code changes.

### Apr 17b
- CSS Token Refactor — 10 passes, all sections. Full token set defined. Mobile dev access setup. Magic link dynamic redirect implemented. Version `00.01.0095`.

### Apr 17c
- Auth callback origin fix (`request.nextUrl.origin`). iPad login investigation begun. Version `00.01.0096`.

### Apr 17d
- Diagnostic alert confirmed client-side code computes correct origin. Supabase logs confirmed OTP requests arriving with wrong referer regardless of device/browser. HTTPS/mkcert setup completed on Mac, iPad, iPhone. Dev script updated. Version `00.01.0097`. Magic link still broken — suspected service worker interference.

---

## Key Technical Notes

### iPad Login — Current State (post 00.01.0097)
- `LoginForm.tsx`: clean `redirectTo = window.location.origin + /auth/callback` ✅
- `route.ts` (auth callback): uses `request.nextUrl.origin` for both redirects ✅
- Supabase allowlist: `http://localhost:3000/**`, `https://helm-gilt.vercel.app/**`, `http://192.168.86.90:3000/**`, `https://192.168.86.90:3000/**` ✅
- Dev server: HTTPS on `0.0.0.0:3000` with mkcert certs ✅
- iPad/iPhone trust mkcert CA ✅
- Root cause of wrong referer: **suspected service worker — unconfirmed**

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
- Redirect URL allowlist: `http://localhost:3000/**`, `https://helm-gilt.vercel.app/**`, `http://192.168.86.90:3000/**`, `https://192.168.86.90:3000/**`
- Code redirect: `window.location.origin` + `/auth/callback` (dynamic)
- Callback route redirect: `request.nextUrl.origin` (dynamic)
- Max sessions per user: capped at 1 (Pro plan required — deferred)

### Local Network Dev Access
- Mac IP: `192.168.86.90`
- Local dev URL: `https://192.168.86.90:3000` (HTTPS)
- iPad/iPhone access: `https://192.168.86.90:3000` in Safari (Comet shows cert warning on Mac)
- `next.config.js`: `allowedDevOrigins: ['192.168.86.90', 'https://192.168.86.90:3000']`
- `package.json`: `"dev": "next dev --experimental-https --experimental-https-cert localhost+1.pem --experimental-https-key localhost+1-key.pem -H 0.0.0.0 -p 3000"`
- mkcert cert files in project root: `localhost+1.pem`, `localhost+1-key.pem` (gitignored)
- mkcert CA root: `/Users/stanleybaptista/Library/Application Support/mkcert/rootCA.pem`

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
