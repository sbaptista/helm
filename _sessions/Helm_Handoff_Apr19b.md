# Helm Handoff — Apr 19b

## Working Rules
0. **Never build without Stan's explicit go-ahead.**
1. **Plan first. Wait for confirmation. Then build.**
2. **Never propose a plan and immediately build in the same response.**
3. **Stan sets the pace.**
4. **Schema-first.** Query `information_schema.columns` before writing any insert code.
5. **Every git push gets a version bump — no exceptions.**
6. **Handoff is generated silently via present_files. No narration.**
7. **Localhost-first development.** All implementation and testing is done on `localhost:3000`. Version bumps happen continuously as changes are made — they reflect that the local version is ahead of production. Git pushes happen only when Stan decides enough changes have accumulated to warrant a release.
8. **Every new form field gets a deliberate label and placeholder text at build time — not deferred.**

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
`00.01.0110` — local only, not yet pushed to production

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
| Calendar | 🔧 In progress — OAuth flow broken (redirect_uri_mismatch) | 00.01.0110 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate internally | Future enhancement |
| 4 | Itinerary row typography | Further refinement possible. Stan happy with current state. | Future / optional |
| 5 | Mobile — text size | Body text readable but Stan would prefer larger. Deferred pending Calendar work. | Future |
| 6 | iPad magic link | OTP / magic link investigation set aside. Auth bypass in place instead. | Set aside |
| 7 | Offline UX | Detect offline state, show banner, hide Edit/Save/Delete controls. | Deferred |
| 8 | Existing sections | Retrofit descriptive labels and placeholders across all existing section forms. | Deferred |
| 9 | Tooltips | Mac/hoverable tooltip pass across all sections. Deferred post-labels retrofit. | Deferred |
| 10 | Trip header actions | Import Document — confirm whether still active or can be removed. | Future |

---

## Next Session
**START HERE: Fix Calendar OAuth — redirect_uri_mismatch**

### What happened
The OAuth flow reaches Google's consent screen but fails with `Error 400: redirect_uri_mismatch`. This started after adding the `state` parameter to `buildAuthUrl`. The redirect URI being sent in the auth request does not exactly match any of the registered URIs in Google Cloud Console.

### What to check first
1. Open Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client
2. Confirm **exact** registered redirect URIs. Should be:
   - `http://localhost:3000/api/gcal/callback`
   - `https://localhost:3000/api/gcal/callback`
   - `https://helm-gilt.vercel.app/api/gcal/callback`
3. Confirm `.env.local` `GOOGLE_REDIRECT_URI` exactly matches one of the above (currently `https://localhost:3000/api/gcal/callback`)
4. Add a temporary `console.log` in `app/api/gcal/auth/route.ts` to log the full auth URL being built — confirm the `redirect_uri` param matches exactly
5. Google is strict: trailing slashes, casing, and http vs https all cause mismatches

### Once OAuth is fixed, remaining Calendar work
- Verify tokens store to `google_oauth_tokens` in Supabase
- Verify `gcal_connected=true` lands back on trip page
- Verify `CalendarButton` detects param, fires `POST /api/gcal/calendar`, transitions to State 2
- End-to-end push test: Update All → verify events appear in Google Calendar

---

## Calendar Feature (designed and mostly built this session)

### Architecture summary
- One dedicated Google Calendar per trip (e.g. "Canadian Rockies Adventure")
- Events derived from Helm data only — no freeform creation
- No new tab — CalendarButton lives in trip header alongside Print Trip
- All pushes are upserts (create if no gcal_event_id, update if exists)
- Dirty flag (`gcal_dirty = true`) set on any record update → triggers State 3
- Push available at trip level only (section-level buttons dropped as redundant)
- Offline: button disabled, label shows "Unavailable offline"

### Google Cloud Console
- Project: Helm
- OAuth 2.0 credentials created (Web Application)
- Registered redirect URIs:
  - `http://localhost:3000/api/gcal/callback`
  - `https://localhost:3000/api/gcal/callback`
  - `https://helm-gilt.vercel.app/api/gcal/callback`
- Test user added: `stan.baptista@gmail.com`
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

### Environment variables
- `.env.local`: `GOOGLE_REDIRECT_URI=https://localhost:3000/api/gcal/callback`
- Vercel: `GOOGLE_REDIRECT_URI=https://helm-gilt.vercel.app/api/gcal/callback`

### New files built
| File | Purpose |
|---|---|
| `lib/gcal/auth.ts` | `buildAuthUrl(tripId)`, `exchangeCodeForTokens`, `refreshAccessToken` |
| `lib/gcal/token.ts` | `getValidAccessToken` — reads DB, auto-refreshes if expiring within 5 min |
| `lib/gcal/client.ts` | `gcalRequest` — thin fetch wrapper for Google Calendar API v3 |
| `lib/gcal/timezones.ts` | City + airport timezone maps, `toLocalISOString` |
| `lib/gcal/events.ts` | Event shape builders for all 6 sections |
| `lib/gcal/push.ts` | `upsertEvent`, `deleteEvent` |
| `app/api/gcal/auth/route.ts` | GET → redirect to Google OAuth; DELETE → disconnect |
| `app/api/gcal/callback/route.ts` | Exchanges code, stores tokens, redirects to trip page |
| `app/api/gcal/calendar/route.ts` | POST create calendar, PATCH rename |
| `app/api/gcal/calendar/clear/route.ts` | POST clears all events, resets all gcal fields |
| `app/api/gcal/status/[tripId]/route.ts` | Returns unconnected / connected / update_required + dirty count |
| `app/api/gcal/push/trip/[tripId]/route.ts` | SSE — pushes all 6 sections |
| `app/api/gcal/push/[section]/[tripId]/route.ts` | SSE — pushes one section |
| `app/api/gcal/push/_shared/pushSection.ts` | Core section push dispatcher |
| `components/advisor/CalendarButton.tsx` | 3-state button + modals + progress UI + offline detection |

### Modified files
| File | Change |
|---|---|
| `components/advisor/TripDetailView.tsx` | CalendarButton rendered after Print Trip |
| `app/api/flights/[id]/route.ts` | PATCH adds `gcal_dirty: true` |
| `app/api/hotels/[id]/route.ts` | PATCH adds `gcal_dirty: true` |
| `app/api/transportation/[id]/route.ts` | PATCH adds `gcal_dirty: true` |
| `app/api/restaurants/[id]/route.ts` | PATCH adds `gcal_dirty: true` |
| `app/api/itinerary/rows/[rowId]/route.ts` | PATCH adds `gcal_dirty: true` |
| `app/api/checklist/[id]/route.ts` | PATCH adds `gcal_dirty: true` |

### Schema changes (applied)
```sql
-- New table
CREATE TABLE google_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  UNIQUE (user_id)  -- added mid-session
);

-- trips
ALTER TABLE trips ADD COLUMN gcal_calendar_id text, gcal_calendar_name text, gcal_last_synced_at timestamptz;

-- flights
ALTER TABLE flights ADD COLUMN gcal_event_id text, gcal_dirty boolean default false;

-- hotels
ALTER TABLE hotels ADD COLUMN gcal_checkin_event_id text, gcal_checkout_event_id text, gcal_dirty boolean default false;

-- transportation
ALTER TABLE transportation ADD COLUMN gcal_event_id text, gcal_dirty boolean default false;

-- restaurants
ALTER TABLE restaurants ADD COLUMN gcal_event_id text, gcal_dirty boolean default false;

-- itinerary_rows
ALTER TABLE itinerary_rows ADD COLUMN gcal_event_id text, gcal_dirty boolean default false;

-- checklist
ALTER TABLE checklist ADD COLUMN warning_days integer, gcal_due_event_id text, gcal_warning_event_id text, gcal_dirty boolean default false;
```

### CalendarButton states
| State | Condition | Label | Style |
|---|---|---|---|
| 1 — Unconnected | No token or no gcal_calendar_id | "Unconnected" | Outline |
| 2 — Connected | Token + calendar, no dirty records | "✅ Connected" | Outline |
| 3 — Update Required | Token + calendar + dirty records > 0 | "Update" | Gold fill, navy text |

### Event shapes
| Section | Events | Timezone source |
|---|---|---|
| Flights | 1 per leg | Origin airport code → AIRPORT_TIMEZONES |
| Hotels | Check-in + check-out | Hotel city → CITY_TIMEZONES |
| Transportation | 1 per segment | Origin city → CITY_TIMEZONES |
| Restaurants | 1 point-in-time, 2hr duration | Restaurant city → CITY_TIMEZONES |
| Itinerary | 1 per row (all-day if is_all_day) | row.start_timezone field |
| Checklist | Due event + warning event (due_date - warning_days) | Pacific/Honolulu |

### Itinerary rows API path
`app/api/itinerary/rows/[rowId]/route.ts` — param is `rowId` not `id`

### Dirty flag logic
- `gcal_event_id = null` → never pushed → create
- `gcal_dirty = true` + existing id → update
- `gcal_dirty = false` + existing id → skip
- Delete in Helm → delete from Google Calendar + clear gcal_event_id

---

## Auth Bypass System (completed Apr 19, v00.01.0098–0103)

### How it works
`BYPASS_AUTH_USER_ID=fdde29b2-a314-4587-940c-373005f79fd5` activates bypass across:
1. `middleware.ts` — unconditional early return
2. All 23 `app/api/` route files — `getAuthUserId()` returns env var
3. `lib/supabase/data-client.ts` — `getDataClient()` returns service role client
4. `DashboardView.tsx` — sign out button hidden/neutralized

### Re-enabling auth
1. Remove `BYPASS_AUTH_USER_ID` from `.env.local` and Vercel
2. Restore `middleware.ts` auth redirect logic
3. Restore `handleSignOut` in `DashboardView.tsx`

---

## iOS Usability Review (completed Apr 19, v00.01.0103)
- iPad and iPhone both working well post-auth bypass
- Text size readable but Stan would prefer larger — deferred

---

## HTTPS / mkcert Setup (completed Apr 17d)
- Local dev URL: `https://192.168.86.90:3000` (Safari on Mac; Comet shows cert warning)
- mkcert cert files: `localhost+1.pem`, `localhost+1-key.pem` (project root, gitignored)
- mkcert CA root: `/Users/stanleybaptista/Library/Application Support/mkcert/rootCA.pem`
- Root CA trusted on iPad and iPhone ✅

---

## Key Technical Notes

### Itinerary rows API path
`app/api/itinerary/rows/[rowId]/route.ts` — param is `rowId`, not `id`

### CSS Token Architecture (post 00.01.0094)
- All font sizes: `--fs-*` tokens
- All font weights: `--fw-*` tokens
- Spacing tokens: `--sp-*` (defined, not yet migrated)
- `var(--surface)` is NOT defined — use `var(--bg)` instead

### CSS Token Set
```css
--fs-xs: 12px  --fs-sm: 14px  --fs-base: 16px  --fs-md: 17px
--fs-lg: 20px  --fs-xl: 24px  --fs-2xl: 28px  --fs-display: 36px  --fs-stat: 40px
--fw-normal: 400  --fw-medium: 600  --fw-bold: 700
--sp-xs: 4px  --sp-sm: 8px  --sp-md: 12px  --sp-lg: 16px  --sp-xl: 20px  --sp-2xl: 24px
--touch-target: 48px  --link: var(--gold-text)  --link-hover: var(--gold)
```

### General (unchanged)
- Trip date range from `trips` table passed as props to constrain date pickers
- TRIP_CITIES timezone map: Honolulu=`Pacific/Honolulu`, Vancouver/Kamloops=`America/Vancouver`, Jasper/Lake Louise/Banff=`America/Edmonton`
- API routes: service role client for data, SSR client for auth only
- Form fields must always initialize to `''` not `null`
- Payload to API must explicitly list only valid DB columns — never spread the whole form object
- **TypeScript strictness**: production build catches type errors dev mode ignores
- **Supabase client import**: `@/lib/supabase/client`
- **3x5 print**: html2canvas → jsPDF. Right padding `0.50in`. Option B deferred.
- **Border pattern**: Button.tsx uses `borderTop/Right/Bottom/Left` longhands
- **File paths**: ChecklistClient and KeyInfoClient at `components/sections/`. Only OverviewClient under `components/trips/overview/`
- **TODOS dev port**: 3001. Helm dev port: 3000
- **params pattern**: all route handlers use `params: Promise<{ id: string }>` with `await params`

---

## Session Transaction Log

### Apr 15
- See Helm_Handoff_Apr15.md.

### Apr 16
- See Helm_Handoff_Apr16.md. Localhost magic link auth fixed. 00.01.0084 pushed to production.

### Apr 17a–17d
- See Helm_Handoff_Apr19.md.

### Apr 19 (morning)
- Auth bypass implemented. iOS usability review. Versions 00.01.0098–0103 pushed to production.

### Apr 19 (afternoon)
- Calendar feature designed and built (Steps 1–10)
- Google Cloud Console setup completed by Stan
- Schema changes applied: `google_oauth_tokens` table + gcal columns on 7 tables
- OAuth flow built: auth, callback, token storage, auto-refresh
- Calendar management routes built: create, rename, clear
- CalendarButton component built: 3 states, modals, SSE progress UI, offline detection
- Push routes built: trip-level + section-level SSE, all 6 section event builders
- Dirty flag wired to 6 update routes
- Section-level push buttons dropped (redundant with dirty flag mechanism)
- OAuth debugging: fixed http→https redirect URI mismatch, added unique constraint to google_oauth_tokens, added state param for tripId, fixed 0.0.0.0 redirect origin
- Session ended with `redirect_uri_mismatch` error — not yet resolved
- Version: 00.01.0110 (local only, not pushed)
