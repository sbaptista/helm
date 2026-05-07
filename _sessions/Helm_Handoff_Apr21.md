# Helm Handoff — Apr 21

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
`00.01.0127` — pushed to production

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
| Calendar | ✅ gcal_include opt-in architecture complete; minimal viable test passed | 00.01.0127 |

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
| 11 | Button.tsx | `borderColor` shorthand conflicts with `borderTop/Right/Bottom/Left` longhands — React warns on rerender (4 warnings, same root cause). Replace `borderColor` with explicit `borderTopColor`, `borderRightColor`, `borderBottomColor`, `borderLeftColor`. | Deferred |
| 12 | gcal_include checkbox | Size consistency across all 6 sections needs visual verification. Fix applied in 00.01.0126 but not fully confirmed. | Deferred |
| 13 | gcal_include new record | Disabled state for new records not verified for Restaurants, Transportation, Checklist, Itinerary. Flights confirmed (disabled until departure_date set). | Deferred |

---

## Next Session
**START HERE: Resume Calendar testing — Blocks 3–8**

gcal_include opt-in architecture is complete and minimally verified:
- ✅ Checkbox persists on save
- ✅ Dirty flag writes correctly (`gcal_include = true`, `gcal_dirty = true`)
- ✅ Push works end-to-end — test event appeared in Google Calendar

### Calendar Test Plan — Status
- Block 1 — Connection & Disconnection: ✅ Complete
- Block 2 — Dirty Flag Behavior: ✅ Complete
- gcal_include architecture: ✅ Built and minimally verified
- Blocks 3–8: **Up next**

### Blocks 3–8
- Block 3 — Push / Upsert
- Block 4 — Delete Propagation
- Block 5 — Event Shape Verification
- Block 6 — Token Refresh
- Block 7 — Offline
- Block 8 — Clear Calendar

---

## Bugs Resolved This Session

| Bug | Description | Resolution |
|---|---|---|
| F8 | Flights PATCH 401 — `getServiceClient` → `serviceClient` rename regression | Fixed in `app/api/flights/[id]/route.ts` |
| F8b | Flights POST 401 — legacy `createAuthClient` pattern in POST route | Fixed in `app/api/trips/[id]/flights/route.ts` — replaced with `getAuthUserId()` pattern |
| F8c | Flights DELETE 401 — legacy `createAuthClient` in DELETE handler | Fixed in `app/api/flights/[id]/route.ts` — removed legacy import, replaced with `getAuthUserId()` |
| F9 | Restaurants PATCH 500 — `{ ...body }` spread sending unknown columns | Fixed in `app/api/restaurants/[id]/route.ts` — explicit field list |
| F9b | Restaurants POST 500 — same spread problem in POST route | Fixed in `app/api/trips/[id]/restaurants/route.ts` — explicit field destructure |
| F9c | Restaurants POST 500 — `type` column NOT NULL, no default, not in form | Fixed: `ALTER TABLE restaurants ALTER COLUMN type SET DEFAULT 'independent'`; `type: type ?? 'independent'` in payload |
| F9d | Restaurants POST 500 — `restaurants_type_check` constraint rejects `'restaurant'` | Fixed: correct default is `'independent'` (allowed values: `'included'`, `'independent'`) |
| F9e | Restaurants POST 500 — `name` column NOT NULL, no default | Fixed: `ALTER TABLE restaurants ALTER COLUMN name SET DEFAULT ''` |
| A1 | Flights gcal_include checkbox enabled on new records with no dates | Fixed in `FlightsClient.tsx` — disabled until `departure_date` set; helper text added |

---

## gcal_include Architecture (complete)

### Summary
- Explicit per-record opt-in replaces implicit dirty-flag model
- Checkbox "Add to Google Calendar" in each section's BottomSheet
- Disabled with helper text when validity condition not met
- New records always initialize unchecked

### Validity rules
| Section | Checkbox enabled when… |
|---|---|
| Flights | `departure_date` is set |
| Hotels | Always enabled |
| Transportation | `departure_date` is set |
| Restaurants | `reservation_date` is set |
| Itinerary | `activity_date` is set |
| Checklist | `due_date` is set |

### Dirty flag logic
- `gcal_include = false` → never dirty, never pushed
- `gcal_include = true` + save → `gcal_dirty = true`
- `gcal_include = false` + save → `gcal_dirty = false`
- Push query: `gcal_include = true AND gcal_dirty = true`

### Schema changes applied this session
```sql
ALTER TABLE flights ADD COLUMN gcal_include boolean default false;
ALTER TABLE hotels ADD COLUMN gcal_include boolean default false;
ALTER TABLE transportation ADD COLUMN gcal_include boolean default false;
ALTER TABLE restaurants ADD COLUMN gcal_include boolean default false;
ALTER TABLE itinerary_rows ADD COLUMN gcal_include boolean default false;
ALTER TABLE checklist ADD COLUMN gcal_include boolean default false;

UPDATE flights SET gcal_include = false, gcal_event_id = null, gcal_dirty = false;
UPDATE hotels SET gcal_include = false, gcal_checkin_event_id = null, gcal_checkout_event_id = null, gcal_dirty = false;
UPDATE transportation SET gcal_include = false, gcal_event_id = null, gcal_dirty = false;
UPDATE restaurants SET gcal_include = false, gcal_event_id = null, gcal_dirty = false;
UPDATE itinerary_rows SET gcal_include = false, gcal_event_id = null, gcal_dirty = false;
UPDATE checklist SET gcal_include = false, gcal_due_event_id = null, gcal_warning_event_id = null, gcal_dirty = false;

ALTER TABLE restaurants ALTER COLUMN type SET DEFAULT 'independent';
ALTER TABLE restaurants ALTER COLUMN name SET DEFAULT '';
```

---

## Auth Bypass System

### How it works
`BYPASS_AUTH_USER_ID=fdde29b2-a314-4587-940c-373005f79fd5` activates bypass across:
1. `middleware.ts` — unconditional early return
2. All API `app/api/` route files — `getAuthUserId()` returns env var
3. `lib/supabase/data-client.ts` — `getDataClient()` returns service role client
4. `DashboardView.tsx` — sign out button hidden/neutralized

### Re-enabling auth
1. Remove `BYPASS_AUTH_USER_ID` from `.env.local` and Vercel
2. Restore `middleware.ts` auth redirect logic
3. Restore `handleSignOut` in `DashboardView.tsx`

---

## HTTPS / mkcert Setup
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
--action: #E07B00  --action-text: #ffffff
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
- **Checklist field**: task field is named `task`, not `title`
- **Restaurants type constraint**: `restaurants_type_check` allows only `'included'` and `'independent'`

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
- Session ended with `redirect_uri_mismatch` error — resolved next session
- Version: 00.01.0110 (local only)

### Apr 20 (morning)
- Calendar OAuth confirmed working. Pushed to production: 00.01.0111
- Calendar test plan defined (8 blocks). Blocks 1 and 2 completed.
- Bugs F1–F7 found and resolved. Versions 00.01.0112–00.01.0121 pushed.

### Apr 20 (afternoon)
- Block 2 completed. Bug F7 resolved.
- Architecture decision: gcal_include opt-in model adopted.
- Full architecture plan documented. Blocks 3–8 on hold.
- Version: 00.01.0121 (local only)

### Apr 21
- gcal_include architecture built (schema + push handler + 6 API routes + 6 client components)
- Bugs F8, F8b, F8c, F9, F9b, F9c, F9d, F9e found and resolved across flights and restaurants routes
- Root causes: legacy auth pattern in DELETE handlers; spread payloads; NOT NULL columns with no defaults; check constraint on restaurants.type
- Flights validity rule updated: checkbox disabled until departure_date set (A1)
- Button.tsx border warning logged as Open Issue #11
- Checkbox size consistency fix applied (00.01.0126), visual verification deferred (Open Issue #12)
- Minimal viable test passed: checkbox persists, dirty flag correct, push end-to-end confirmed in Google Calendar
- Versions 00.01.0122–00.01.0127 pushed to production
