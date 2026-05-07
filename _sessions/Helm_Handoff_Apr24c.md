# Helm Handoff — Apr 24c

## INCLUDE THIS SECTION WITH ALL HANDOFFS

My name is Stan. Read this file completely. When you are done answer the following questions:

1. Describe the project you and I are going to work on.
2. Explain versioning and what needs to be updated for a new release.
3. Explain the versioned file name format.
4. What are the working rules?
5. What is the most important rule?
6. Describe the use of AI and the typical workflow.
7. What is our next task(s)?

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
`00.01.0154` — local only, not yet pushed to production

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | ✅ Fully functional | 00.01.0081 |
| Checklist | ✅ Functional + WARN system | 00.01.0141 |
| Packing | ✅ Functional | 00.01.0050 |
| Key Info | ✅ Functional (Gold Standard CRUD) | 00.01.0054 |
| Transportation | ✅ Functional + WARN system + action_note | 00.01.0147 |
| Hotels | ✅ Functional + WARN system + action_note | 00.01.0141 |
| Flights | ✅ Parity build complete + WARN system + validation guards | 00.01.0141 |
| Restaurants | ✅ Full redesign complete + WARN system | 00.01.0147 |
| Itinerary | ✅ Parity declared complete + WARN system | 00.01.0147 |
| Printing | ✅ 3x5 cards overhauled | 00.01.0059 |
| Calendar | ✅ gcal_include opt-in architecture complete; all known bugs resolved | 00.01.0136 |
| Logs | ✅ Complete — Phase 1–4 done. Displayed as standalone view (not a tab). | 00.01.0153 |
| Search | ✅ Full-site search built — all 3 phases complete | 00.01.0154 |

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
| 15 | Required field indicators | Visual indication of required fields across all section forms. Design deferred. | Future |
| 16 | Fatal error page | Dark theme feels foreboding. Needs design revisit. | Deferred |
| 17 | Search — no back navigation | `/search` page has no path back to the app. User must use browser back button. Fix first thing next session. | Fix next session |

---

## Next Session
**Fix Issue #17 first:** Add back navigation to the `/search` page.

After that, candidates (lower priority):
- **Issue 14** — Group header conformance pass across all sections
- **Issue 8** — Retrofit labels and placeholders across all section forms
- **Issue 3** — Key Info strip URL behavior
- **Issue 7** — Offline UX

---

## Search Architecture (complete — 00.01.0154)

### Decisions made
- **Scope:** Entire app — all trips, all sections
- **Entry point:** SearchBar in trip header (right of wordmark), visible on trip pages
- **Results display:** Full results page `/search` (server component)
- **Searchable content:** Text fields only — all text columns per section table, no exclusions
- **Result click behavior:** Navigate directly to the record — correct trip, correct section, record BottomSheet opened via deep-link
- **Logs in search:** Included via Logs toggle (off by default) — not mixed with trip content results by default

### Search execution
Client-side JS filtering on server-fetched records. Data volume is small; no complex OR queries needed.

### Section priority order (sort)
1. itinerary
2. flights
3. hotels
4. restaurants
5. transportation
6. checklist
7. key_info
8. packing
9. logs

### Filter model
- **Section pills:** All (default) + one pill per section that has results. Client-side filter, no re-fetch.
- **Logs toggle:** Off by default. Toggling on triggers a re-fetch (logs require a separate DB query).

### The hard problem: deep linking to a record
Clicking a search result navigates to `/trips/[id]?section=flights&record=abc123`. The trip page reads those params on load, sets the active section, and opens the correct record's BottomSheet automatically.

### Deep-link implementation (as built)
- `TripDetailView` extended `TabNavigationContext` with `pendingSheetRecordId` / `clearPendingSheetRecord`
- Reads `?section` and `?record` URL params on mount, maps section key → tab, immediately cleans the URL via `router.replace`
- All 8 section clients consume `pendingSheetRecordId` from context and call their `openEdit` function when the ID matches

### Component architecture (as built)
| File | Description |
|---|---|
| `app/api/search/route.ts` | GET — scopes to user's trips via `trip_members`, fetches all 8 section tables + helm_logs, JS filtering, returns `SearchResult[]` sorted by section priority then title |
| `components/search/SearchBar.tsx` | Text input in trip header (right of wordmark), navigates to `/search?q=…`, preserves params when already on `/search` |
| `app/search/page.tsx` | Server component reading `q`, `section`, `logs` searchParams |
| `components/search/SearchResults.tsx` | Client component — section pill filters (client-side), Logs toggle (triggers re-fetch), result count, empty state |
| `components/search/SearchResultCard.tsx` | Gold-bordered section badge + title/subtitle, links to `/advisor/trips/:id?section=&record=` |

### SearchResult shape
```ts
interface SearchResult {
  id: string        // record id
  section: string   // section key
  trip_id: string   // for building the deep-link URL
  title: string     // primary display text
  subtitle: string  // secondary display text
}
```

### Searched text columns per table
```
flights:          flight_number, airline, origin_airport, destination_airport,
                  cabin_class, confirmation_number, notes, gcal_event_id,
                  origin_city, destination_city, departure_timezone,
                  arrival_timezone, seat_number, departure_terminal,
                  departure_gate, arrival_terminal, arrival_gate

hotels:           name, address, city, confirmation_number, phone,
                  website_url, notes, room_type, gcal_checkin_event_id,
                  gcal_checkout_event_id, province, postal_code, maps_url,
                  action_note

transportation:   type, provider, origin, destination, confirmation_number,
                  notes, phone, website_url, cost, gcal_event_id,
                  departure_timezone, arrival_timezone, action_note

itinerary_rows:   title, description, location, category, start_timezone,
                  action_note, end_timezone, gcal_event_id

restaurants:      name, type, cuisine, address, city, confirmation_number,
                  phone, website_url, notes, booking_url, style,
                  gcal_event_id, display_label, reservation_status,
                  booking_source, maps_url, action_note, state_province,
                  postal_code, email

checklist:        task, group_name, ref, status, resolution, notes,
                  action_note, gcal_due_event_id, gcal_warning_event_id

key_info:         category, label, value, url, url_label, action_note

packing:          person, text
                  + joined packing_groups(name) and packing_subgroups(name)

helm_logs:        level, source, message
                  (only when logs=true; scoped to user's trip_ids OR null trip_id)
```

---

## Logs View Architecture

Logs is NOT a section tab. It is a standalone view within the trip page.

- "Logs" link lives in the trip header actions area alongside Edit trip, Clear trip data, Delete trip
- Clicking sets `showLogs = true` in `TripDetailView.tsx`
- When `showLogs` is true: tab bar and section content are replaced entirely by a `← Back` button + `<LogsClient tripId={localTrip.id} />`
- When `showLogs` is false: everything renders exactly as before — tab bar, active section, unchanged
- Back button sets `showLogs = false` — previously active tab is still active on return
- Tab system has zero awareness of Logs

---

## Error & Logging System — Full Spec

### Taxonomy

| Level | User sees | App behavior | Logged |
|---|---|---|---|
| VALIDATION_ERROR | Inline message | Block save/push | No |
| WARN | Inline badge on record + section banner (warn count) | Operation completes | Yes |
| ERROR | Toast (error variant) | Operation fails | Yes |
| CRITICAL | Persistent section banner, no dismiss, Retry button | Section degraded | Yes |
| FATAL | Full-screen block, no dismiss, Reload button | App blocked | Yes |

### User-facing copy (applied in UI — not raw level names)
| Level | User-facing copy |
|---|---|
| WARN | "Needs Attention" |
| ERROR | "Something went wrong" |
| CRITICAL | "Feature unavailable" |
| FATAL | "App error — please reload" |

Raw level names (WARN, ERROR, etc.) are used in the Logs section only, which is a diagnostic tool.

### VALIDATION_ERROR Conditions (block save, inline message, not logged)
| Condition | Section |
|---|---|
| `gcal_include = true` but timezone missing | Flights, Transportation |
| `gcal_include = true` but date field missing | All sections |
| Required field missing | All sections |
| Departure time set but departure date missing | Flights |
| Arrival time set but arrival date missing | Flights |
| Arrival before departure (both date+time present) | Flights |
| Flight number missing | Flights |
| Airline name missing | Flights |

### WARN Conditions (inline badge on record + section banner rollup, logged)
| Condition | Section |
|---|---|
| `action_required = true` | Flights, Hotels, Transportation, Restaurants, Checklist, Itinerary |
| Missing departure or arrival time | Flights |
| Past `due_date` and not completed | Checklist |

### ERROR Conditions (toast, logged)
| Condition | Section |
|---|---|
| Save failed (API returned error) | All sections |
| Delete failed (API returned error) | All sections |
| Calendar push failed for one or more records | Calendar |
| Calendar token refresh failed / revoked | Calendar |
| Record skipped during push | Calendar |

### CRITICAL Conditions (persistent section banner, logged)
| Condition | Section |
|---|---|
| API route unhandled exception | Any |
| Total calendar push failure | Calendar |

### FATAL Conditions (full-screen block, logged)
| Condition | Scope |
|---|---|
| Supabase client failed to initialize | App-wide |

### PersistentMessage copy
- `critical` variant: title "Feature unavailable", body "Something went wrong. Please try again.", Retry button
- `fatal` variant: dark `#111111` full-viewport background, centered card, `ShieldX` icon, eyebrow "Fatal error", headline "App error", body "Something went wrong. Please reload the page.", white Reload button calling `window.location.reload()`

### Section Banner Rollup
- Each section shows a banner at the top when one or more records have active WARN conditions
- Banner shows count: e.g. "2 items need attention"
- Banner disappears when all WARN conditions in the section are resolved

---

## Error & Logging System — Infrastructure (Phases 1–4 complete)

### Phase Status
| Phase | Description | Status |
|---|---|---|
| 1 | Foundation — helm_logs table, logger.ts, PersistentMessage component, CSS tokens | ✅ Complete — 00.01.0137 |
| 2 | Wire up error handling — API routes, client components, calendar push | ✅ Complete — 00.01.0138 |
| 3 | WARN system — inline badges on records + section banner rollup | ✅ Complete — 00.01.0147 |
| 4 | Logs section — viewer, filters, clear by date threshold | ✅ Complete — 00.01.0143 |

### New files
- `lib/logger.ts` — server-side only, fire-and-forget, 4 levels (warn/error/critical/fatal), logs to `helm_logs` via service role client, `console.error` backstop on logging failure. Uses `SUPABASE_SECRET_KEY` env var.
- `components/ui/PersistentMessage.tsx` — two variants: `critical` and `fatal`. No dismiss on either.
- `components/ui/WarnBadge.tsx` — inline badge using `--action` / `--action-text` tokens. Accepts `label` prop. Renders ⚠ + text.
- `components/ui/LevelBadge.tsx` — used in Logs section. Icon + label + color per level. Uses Lucide icons: `AlertTriangle` (WARN), `CircleX` (ERROR), `OctagonAlert` (CRITICAL), `ShieldX` (FATAL).
- `components/ui/DevDebugPanel.tsx` — dev-only floating panel (bottom-right, `NODE_ENV === 'development'` guard). Three buttons: Trigger Error, Trigger Critical, Trigger Fatal. Critical and Fatal use `createPortal`.
- `components/sections/LogsClient.tsx` — full logs viewer. Level filter, source filter, expand/collapse rows, clear by threshold with confirmation.
- `app/api/trips/[id]/logs/route.ts` — GET (fetch logs, trip-scoped + null trip_id) and DELETE (clear by days threshold: 7/30/90).

### New CSS tokens (globals.css)
```css
--critical: #C0390B
--critical-text: #ffffff
--error: #B45309
--error-text: #ffffff
--fatal: #7F1D1D
--fatal-text: #ffffff
```

### helm_logs table
```sql
CREATE TABLE helm_logs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete set null,
  level text not null,
  source text not null,
  message text not null,
  payload jsonb,
  created_at timestamptz default now()
);
```
Append-only. No updates. Hard delete for housecleaning.

### WARN logging — sections and conditions
| Section | Route | Condition logged |
|---|---|---|
| Flights | `app/api/flights/[id]/route.ts` | `action_required`, missing `departure_time`, missing `arrival_time` |
| Hotels | `app/api/hotels/[id]/route.ts` | `action_required` |
| Transportation | `app/api/transportation/[id]/route.ts` | `action_required` |
| Restaurants | `app/api/restaurants/[id]/route.ts` | `action_required` |
| Checklist | `app/api/checklist/[id]/route.ts` | `action_required`, past due |
| Itinerary | `app/api/itinerary/rows/[rowId]/route.ts` | `action_required` |

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

### Transportation (00.01.0130 + 00.01.0147)
```sql
ALTER TABLE transportation ADD COLUMN departure_timezone text;
ALTER TABLE transportation ADD COLUMN arrival_timezone text;
ALTER TABLE transportation ADD COLUMN action_note text;
```
Note: `action_required` was already present on this table before this session.

### Hotels (00.01.0130 + session)
```sql
ALTER TABLE hotels ADD COLUMN province text;
ALTER TABLE hotels ADD COLUMN postal_code text;
ALTER TABLE hotels ADD COLUMN maps_url text;
-- action_required and action_note were already present
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
`pushHotels` creates two Google Calendar events per hotel record: check-in and check-out. `gcal_checkin_event_id` and `gcal_checkout_event_id` are stored separately.

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

### Flights form state field names
The Flights form uses `departure_time_val` and `arrival_time_val` as form state field names (not `departure_time` / `arrival_time`). Validation guards reference `form.departure_time_val` / `form.arrival_time_val`.

### Itinerary rows data structure
Rows are stored in a flat `rows: ItineraryRow[]` state array — not nested inside days. Days are a separate `days: ItineraryDay[]` array joined at render time via a `rowsByDay` Map keyed by `day_id`. WARN count: `rows.filter(r => getItineraryWarns(r).length > 0).length`.

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
--critical: #C0390B  --critical-text: #ffffff
--error: #B45309  --error-text: #ffffff
--fatal: #7F1D1D  --fatal-text: #ffffff
```

### General (unchanged)
- Trip date range from `trips` table passed as props to constrain date pickers
- TRIP_CITIES timezone map: Honolulu=`Pacific/Honolulu`, Vancouver/Kamloops=`America/Vancouver`, Jasper/Lake Louise/Banff=`America/Edmonton`
- API routes: service role client for data, SSR client for auth only
- Form fields must always initialize to `''` not `null`
- Payload to API must explicitly list only valid DB columns — never spread the whole form object
- **TypeScript strictness**: production build catches type errors dev mode ignores
- **Supabase client import**: `@/lib/supabase/client`
- **Service role env var**: `SUPABASE_SECRET_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`)
- **3x5 print**: html2canvas → jsPDF. Right padding `0.50in`. Option B deferred.
- **File paths**: ChecklistClient and KeyInfoClient at `components/sections/`. Only OverviewClient under `components/trips/overview/`
- **TODOS dev port**: 3001. Helm dev port: 3000
- **params pattern**: all route handlers use `params: Promise<{ id: string }>` with `await params`
- **Checklist field**: task field is named `task`, not `title`
- **Checklist completed state**: field is `status: string`, value `'completed'` — not a boolean `completed` field
- **Restaurants type constraint**: `restaurants_type_check` allows only `'included'` and `'independent'`
- **logger.ts**: server-side only — never import in client components

---

## Design Decisions (apply going forward)
- **Airport code → city + timezone auto-populate** (Flights only)
- **City select → timezone auto-set** (all other sections — not yet built)
- **State / Province** — single free text field, label "State / Province", placeholder "e.g. BC or WA" — applies to Hotels, Restaurants, and anywhere else an address appears
- **Form group headers** — ALL CAPS, `var(--gold)` color, 2px divider line, 28px top margin (except first group). Established in Restaurants — conformance pass to other sections deferred.
- **Raw URLs never display as text on cards** — always rendered as labelled links (Map ↗, View Booking ↗, Website ↗)
- **Line clamps on cards**: style = 2 lines, notes = 3 lines, address = 1 line, action_note = 2 lines, URLs = labelled links only
- **`--action` token**: `#D4700A` — system-wide "needs attention" color with white text
- **`--critical` token**: `#C0390B` — system-level failure color, distinct from `--action`
- **Severity badges (Logs section)**: icon + label + color. Shape differentiates levels, not color alone. Uses Lucide icons per level.
- **WARN system**: `action_required = true` is a WARN condition in every section that has the field. WarnBadge inline on card, WarnBanner rollup at section top.
- **Search result cards**: gold-bordered section badge + title + subtitle. Deep-link opens correct section and record via `TabNavigationContext`.

---

## Trip ID
`0e1d98a3-a124-42e1-b68d-498bb60f46be`

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

### Apr 23 (morning)
- `--action` token darkened: `#E07B00` → `#D4700A`. Version 00.01.0133.
- CalendarButton post-push regression fixed. Version 00.01.0133.
- `pushHotels` and `pushChecklist` dirty reset made unconditional. Version 00.01.0135.
- Root cause of persistent State 3 fixed: `.is('deleted_at', null)` added to all 6 count queries. Version 00.01.0136.
- Transportation section title "v46" bug fixed. Version 00.01.0134.
- `RestaurantsSection.tsx` explicit column list replaced with `select('*')`. Version 00.01.0136.
- Restaurants card Test C passed. 00.01.0136 pushed to production.

### Apr 23 (afternoon)
- CAN26 → Helm parity audit: Itinerary and Checklist declared at sufficient parity. Parity audit complete across all sections.
- Error & Logging system designed: taxonomy (VALIDATION_ERROR / WARN / ERROR / CRITICAL / FATAL), warn conditions, error conditions, helm_logs schema, Logs section spec.
- Phase 1 built: helm_logs table created in Supabase, --critical/--critical-text tokens added, lib/logger.ts created, components/ui/PersistentMessage.tsx created. Version 00.01.0137.
- Phase 2 built: all 9 API routes wrapped in outer try/catch + logger.error on Supabase errors; calendar push SSE route outer try/catch added; FlightsClient setSaveError replaced with toast; ItineraryClient toast message standardized; HotelsClient neutral→error toast; 4 silent toggle reverts now show toast. Version 00.01.0138.
- 00.01.0138 pushed to production.

### Apr 24 (morning)
- Phase 3 (WARN system) built: WarnBadge component, WarnBanner pattern, WARN conditions wired for Flights/Hotels/Checklist. Version 00.01.0139.
- Flights validation guards added: flight number required, airline required, time requires date, arrival must be after departure. Version 00.01.0141.
- Hotels WARN model revised: missing check-in/check-out removed; action_required added as WARN. action_note column confirmed present. Version 00.01.0141.
- Checklist WARN unified: action_required added to getChecklistWarns; standalone Badge replaced with WarnBadge. Version 00.01.0141.
- UI check passed for Flights, Hotels, Checklist.
- Ghost flight record (junk test record predating validation guards) deleted via Supabase SQL — hard delete.
- Open Issue #15 added: required field indicators (design deferred).
- Phase 4 (Logs section) built: LevelBadge component, --error/--error-text/--fatal/--fatal-text CSS tokens, GET+DELETE API route, LogsClient, Logs tab added to nav. Version 00.01.0142.
- PersistentMessage.tsx copy updated: critical → "Feature unavailable" / "Something went wrong. Please try again."; fatal → "App error" / "Something went wrong. Please reload the page." Version 00.01.0143.
- logger.ts env var bug fixed: SUPABASE_SERVICE_ROLE_KEY → SUPABASE_SECRET_KEY. Version 00.01.0144.
- Checklist API route: action_required WARN logging added (was missing from earlier pass). Version 00.01.0145.
- WARN system extended to Transportation, Restaurants, Itinerary: getXxxWarns helpers, WarnBadge + WarnBanner, API route WARN logging. Transportation action_note column added. Version 00.01.0147.
- Log catchup SQL run: existing action_required records across all sections inserted into helm_logs.
- Severity badge design decision: icon + color + label (not color alone). Lucide icons per level. User-facing copy softened for CRITICAL/FATAL.
- Pushed to production: 00.01.0147.

### Apr 24 (afternoon)
- Clear Trip modal double-render bug found and fixed: stub `<Modal open={clearOpen}>` at line 1166 deleted. Version 00.01.0148.
- Logs moved out of section nav. Now lives as "Logs" link in trip header actions area. Opens as standalone view replacing tab bar and section content. Back button returns to previous tab. Version 00.01.0149–00.01.0153.
- Dev Debug Panel built. Fatal error page redesigned. Open Issue #16 added. Version 00.01.0150–00.01.0152.
- Pushed to production: 00.01.0153.

### Apr 24 (evening)
- Search architecture designed (AI1 session): all decisions made, instructions written for AI2.
- Search built by AI2 — all 3 phases complete. Version 00.01.0154.
  - Phase 1: `app/api/search/route.ts` — JS filtering across all 8 section tables + helm_logs, scoped to user's trips, sorted by section priority then title.
  - Phase 2: `SearchBar` (trip header, right of wordmark), `/search` page, `SearchResults` (section pills + Logs toggle), `SearchResultCard` (gold-bordered badge + deep-link).
  - Phase 3: `TripDetailView` extended `TabNavigationContext` with `pendingSheetRecordId` / `clearPendingSheetRecord`; all 8 section clients consume context and open matching BottomSheet on deep-link.
- Open Issue #17 added: `/search` page has no back navigation — browser back button required. Fix first thing next session.
- Stan testing locally before pushing to production.
