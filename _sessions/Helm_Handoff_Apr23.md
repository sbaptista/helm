# Helm Handoff — Apr 23

## INCLUDE THIS SECTION WITH ALL HANDOFFS

My name is Stan. Read this file completely. When you are done answer the following questions:

1. Describe the project you and I are going to work on.
2. Explain versioning and what needs to be updated for a new release. 
3. Explain the versioned file name format.
4. What are the working rules?
5. What is the most important rule?
6. Describe the use of AI and the typical workflow.
7.	What is our next task(s)?

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
`00.01.0136` — pushed to production

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | ✅ Fully functional | 00.01.0081 |
| Checklist | ✅ Functional | 00.01.0050 |
| Packing | ✅ Functional | 00.01.0050 |
| Key Info | ✅ Functional (Gold Standard CRUD) | 00.01.0054 |
| Transportation | ✅ Functional + timezone fields added | 00.01.0130 |
| Hotels | ✅ Functional + province/postal/maps fields added | 00.01.0130 |
| Flights | ✅ Parity build complete — full field set + auto-populate + timezone | 00.01.0129 |
| Restaurants | ✅ Full redesign complete — card test passed | 00.01.0136 |
| Itinerary | ✅ Stages 1–3 complete + typography pass | 00.01.0084 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |
| Calendar | ✅ gcal_include opt-in architecture complete; all known bugs resolved | 00.01.0136 |

---

## Open Issues

| # | Area | Issue | Status |
|---|---|---|---|
| 1 | Auth | Max sessions per user capped at 1 in Supabase — requires Pro plan upgrade. | Known / deferred |
| 2 | 3x5 Cards | Content-aware card splitting (Option B) deferred | Future |
| 3 | Key Info strip | If item has a URL, clicking should open externally; if no URL, navigate internally | Future enhancement |
| 4 | Itinerary row typography | Further refinement possible. Stan happy with current state. | Future / optional |
| 5 | Mobile — text size | Body text readable but Stan would prefer larger. Deferred. | Future |
| 6 | iPad magic link | OTP / magic link investigation set aside. Auth bypass in place instead. | Set aside |
| 7 | Offline UX | Detect offline state, show banner, hide Edit/Save/Delete controls. | Deferred |
| 8 | Existing sections | Retrofit descriptive labels and placeholders across all existing section forms. | Deferred |
| 9 | Tooltips | Mac/hoverable tooltip pass across all sections. Deferred post-labels retrofit. | Deferred |
| 10 | Trip header actions | Import Document — confirm whether still active or can be removed. | Future |
| 12 | gcal_include checkbox | Size consistency across all 6 sections needs visual verification. | Deferred |
| 13 | gcal_include new record | Disabled state for new records not verified for Restaurants, Transportation, Checklist, Itinerary. Flights confirmed. | Deferred |
| 14 | Conformance / consistency pass | Group headers (gold color, 2px divider, 28px top margin) established in Restaurants — needs to be applied to all other sections. Broad pass deferred. | Future |

---

## Next Session
**START HERE: CAN26 → Helm parity audit — Itinerary and Checklist**

### Remaining parity sections
- **Itinerary** — compare against CAN26 itinerary rows
- **Checklist** — compare against CAN26 todos
- Packing — already at parity ✅
- Key Info — Helm addition, no CAN26 equivalent

---

## Design Decisions (apply going forward)
- **Airport code → city + timezone auto-populate** (Flights only)
- **City select → timezone auto-set** (all other sections — not yet built)
- **State / Province** — single free text field, label "State / Province", placeholder "e.g. BC or WA" — applies to Hotels, Restaurants, and anywhere else an address appears
- **Form group headers** — ALL CAPS, `var(--gold)` color, 2px divider line, 28px top margin (except first group). Established in Restaurants — conformance pass to other sections deferred.
- **Raw URLs never display as text on cards** — always rendered as labelled links (Map ↗, View Booking ↗, Website ↗)
- **Line clamps on cards**: style = 2 lines, notes = 3 lines, address = 1 line, action_note = 2 lines, URLs = labelled links only
- **`--action` token**: `#D4700A` (updated from `#E07B00` this session) — system-wide "needs attention" color with white text

---

## Parity Audit — Schema Changes Applied

### Flights (00.01.0129)
```sql
ALTER TABLE flights ADD COLUMN origin_city text;
ALTER TABLE flights ADD COLUMN destination_city text;
ALTER TABLE flights ADD COLUMN departure_timezone text;
ALTER TABLE flights ADD COLUMN arrival_timezone text;
ALTER TABLE flights ADD COLUMN seat_number text;
ALTER TABLE flights ADD COLUMN departure_terminal text;
ALTER TABLE flights ADD COLUMN departure_gate text;
ALTER TABLE flights ADD COLUMN arrival_terminal text;
ALTER TABLE flights ADD COLUMN arrival_gate text;
ALTER TABLE flights ADD COLUMN action_required boolean default false;
```

### Transportation (00.01.0130)
```sql
ALTER TABLE transportation ADD COLUMN departure_timezone text;
ALTER TABLE transportation ADD COLUMN arrival_timezone text;
```

### Hotels (00.01.0130)
```sql
ALTER TABLE hotels ADD COLUMN province text;
ALTER TABLE hotels ADD COLUMN postal_code text;
ALTER TABLE hotels ADD COLUMN maps_url text;
```

### Restaurants (00.01.0131)
```sql
ALTER TABLE restaurants ADD COLUMN display_label text;
ALTER TABLE restaurants ADD COLUMN reservation_status text default 'TBD';
ALTER TABLE restaurants ADD COLUMN confirmed boolean default false;
ALTER TABLE restaurants ADD COLUMN booking_source text;
ALTER TABLE restaurants ADD COLUMN maps_url text;
ALTER TABLE restaurants ADD COLUMN action_note text;
ALTER TABLE restaurants ADD COLUMN state_province text;
ALTER TABLE restaurants ADD COLUMN postal_code text;
ALTER TABLE restaurants ADD COLUMN email text;
ALTER TABLE restaurants DROP COLUMN website;
```

---

## Bugs Resolved This Session

| Bug | Description | Resolution |
|---|---|---|
| C1 | CalendarButton stayed in State 3 after successful push | `fetchStatus()` added to SSE `'complete'` handler in `CalendarButton.tsx` |
| C2 | `pushHotels` — `gcal_dirty: false` only reset if check-out upsert succeeded | Reset moved to unconditional update after both try/catch blocks |
| C3 | `pushChecklist` — `gcal_dirty: false` only reset if warning event upsert succeeded | Reset moved to unconditional update after if/else blocks |
| C4 | Status endpoint counted soft-deleted records as dirty | `.is('deleted_at', null)` added to all 6 count queries in status route |
| C5 | Transportation section title showed "Transportation v46" | Stray variable removed from title string in `TransportationClient.tsx` |
| C6 | `RestaurantsSection.tsx` had explicit column list missing new parity columns — production build TypeScript error | Replaced with `.select('*')` |

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
- Push query: `gcal_include = true AND gcal_dirty = true AND deleted_at IS NULL`

### Hotels — two events per record
`pushHotels` creates two Google Calendar events per hotel record: check-in and check-out. This is intentional. `gcal_checkin_event_id` and `gcal_checkout_event_id` are stored separately.

---

## Flights — AIRPORT_LOOKUP (lib/gcal/timezones.ts)
```ts
export const AIRPORT_LOOKUP: Record<string, { city: string; timezone: string }> = {
  HNL: { city: 'Honolulu, HI',    timezone: 'Pacific/Honolulu'    },
  SEA: { city: 'Seattle, WA',     timezone: 'America/Los_Angeles' },
  YVR: { city: 'Vancouver, BC',   timezone: 'America/Vancouver'   },
  YKA: { city: 'Kamloops, BC',    timezone: 'America/Vancouver'   },
  YJA: { city: 'Jasper, AB',      timezone: 'America/Edmonton'    },
  YBW: { city: 'Banff, AB',       timezone: 'America/Edmonton'    },
};
```
Airport code entered in form → onBlur → auto-populates city + timezone. Unknown codes leave fields unchanged.

## Timezone Select Options (Flights + Transportation)
```ts
const TIMEZONE_OPTIONS = [
  { value: 'Pacific/Honolulu',    label: 'Honolulu (HST)' },
  { value: 'America/Los_Angeles', label: 'Seattle / Pacific (PDT/PST)' },
  { value: 'America/Vancouver',   label: 'Vancouver / Kamloops (PDT/PST)' },
  { value: 'America/Edmonton',    label: 'Jasper / Banff (MDT/MST)' },
];
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

### GET route select lists
- Flights: explicit column list (maintained — must update when schema changes)
- All other sections: `select('*')` — no maintenance needed

### Border pattern (updated)
Button.tsx uses `borderStyle` + `borderWidth` + four `borderXxxColor` longhands. Callers must never pass `borderColor` in a `style` prop to `<Button>` — use four explicit `borderXxxColor` properties instead.

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
--action: #D4700A  --action-text: #ffffff
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
- Calendar feature designed and built (Steps 1–10). Version: 00.01.0110 (local only).

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
- Bugs F8, F8b, F8c, F9–F9e resolved
- Minimal viable Calendar test passed — checkbox persists, dirty flag correct, push end-to-end confirmed
- Versions 00.01.0122–00.01.0127 pushed to production

### Apr 22
- Calendar testing declared complete (minimal viable test = done)
- CAN26 → Helm parity audit begun — Flights first
- Flights parity build: 10 new schema columns, AIRPORT_LOOKUP auto-populate, timezone selects, seat number, terminal/gate, action_required, updated card UX. Version 00.01.0129.
- Bug B1 found and fixed: GET route for flights missing new columns — refetch was wiping field values after save
- Full GET route audit: all other sections use select('*') — no gaps. Flights was the only explicit list.
- Transportation parity: departure_timezone + arrival_timezone added. Version 00.01.0130.
- Hotels parity: province, postal_code, maps_url added. Version 00.01.0130.
- Restaurants parity: full redesign — 9 new schema columns, orphan `website` column dropped, full form reorganization (5 groups with gold headers), full card redesign. Version 00.01.0131.
- Bug B2 fixed: Button.tsx borderColor conflict — 4 React warnings eliminated. Fix applied across 7 files.
- Open Issue #11 closed.
- Open Issue #14 added: conformance pass for group headers across all sections (deferred).
- Restaurants card test partially complete — Test C pending next session.

### Apr 23
- `--action` token darkened: `#E07B00` → `#D4700A`. Version 00.01.0133.
- CalendarButton post-push regression fixed: `fetchStatus()` added to SSE `'complete'` handler. Version 00.01.0133.
- `pushHotels` and `pushChecklist` dirty reset made unconditional. Version 00.01.0135.
- Root cause of persistent State 3 found via SQL: soft-deleted record with `gcal_dirty = true` was being counted by status endpoint. Fixed: `.is('deleted_at', null)` added to all 6 count queries. Version 00.01.0136.
- Transportation section title "v46" bug fixed. Version 00.01.0134.
- `RestaurantsSection.tsx` explicit column list replaced with `select('*')` — fixed production TypeScript build error. Version 00.01.0136.
- Restaurants card Test C passed — visual confirmation.
- 00.01.0136 pushed to production.
