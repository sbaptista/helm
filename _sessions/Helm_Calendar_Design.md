# Helm — Calendar Feature Design
**Status:** Design complete, awaiting build approval
**Target version:** 00.01.0104+

---

## Overview

Calendar is not a new section tab. It is a Google Calendar integration that pushes Helm trip data into a dedicated Google Calendar as structured events. Push is available at two levels: the entire trip, or per section. All pushes are upserts.

---

## Prerequisites: Google Cloud Console Setup

Before any code is written, Stan must complete the following in Google Cloud Console (one-time, manual):

1. Create a new project (e.g. "Helm")
2. Enable the **Google Calendar API**
3. Create **OAuth 2.0 credentials** (Web Application type)
4. Set authorized redirect URI to:
   - `http://localhost:3000/api/gcal/callback`
   - `https://helm-gilt.vercel.app/api/gcal/callback`
5. Note the `CLIENT_ID` and `CLIENT_SECRET`
6. Add both to `.env.local` and Vercel environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (environment-specific)

---

## Database Schema Changes

### New table: `google_oauth_tokens`
```sql
id              uuid primary key default gen_random_uuid()
user_id         uuid not null references auth.users(id)
access_token    text not null
refresh_token   text not null
expires_at      timestamptz not null
created_at      timestamptz default now()
updated_at      timestamptz default now()
```
One row per user. Upsert on reconnect.

### Modifications to existing tables

| Table | New Columns |
|---|---|
| `trips` | `gcal_calendar_id text`, `gcal_calendar_name text`, `gcal_last_synced_at timestamptz` |
| `flights` | `gcal_event_id text`, `gcal_dirty boolean default false` |
| `hotels` | `gcal_checkin_event_id text`, `gcal_checkout_event_id text`, `gcal_dirty boolean default false` |
| `transportation` | `gcal_event_id text`, `gcal_dirty boolean default false` |
| `restaurants` | `gcal_event_id text`, `gcal_dirty boolean default false` |
| `itinerary_rows` | `gcal_event_id text`, `gcal_dirty boolean default false` |
| `checklist` | `warning_days integer`, `gcal_due_event_id text`, `gcal_warning_event_id text`, `gcal_dirty boolean default false` |

### Dirty flag logic
- `null` gcal_event_id = never pushed → **create**
- `gcal_dirty = true` + existing gcal_event_id → **update**
- `gcal_dirty = false` + existing gcal_event_id → **skip**
- Record deleted in Helm → **delete** from Google Calendar + clear gcal_event_id

After a successful push, all pushed records: set `gcal_dirty = false`, set `gcal_event_id` from Google Calendar response. Trip: update `gcal_last_synced_at = now()`.

### Triggering dirty flag
Each of the 6 calendar-enabled sections has an update API route. Each update route adds `gcal_dirty = true` to its UPDATE payload when a record is modified. Delete routes clear the gcal_event_id after deleting the calendar event.

---

## Auth & Token Flow

### OAuth 2.0 — one-time per user account
1. User clicks Calendar button (State 1 — Unconnected)
2. Connection modal opens — user sets calendar name (default: trip name), clicks "Connect Google"
3. Helm redirects to Google OAuth consent screen (`GET /api/gcal/auth`)
4. Google redirects back to `GET /api/gcal/callback`
5. Helm exchanges code for access token + refresh token
6. Both tokens stored in `google_oauth_tokens` table keyed to user ID
7. Modal returns to connected state — "Update All" available

### Token refresh (invisible, server-side)
- Every API route that calls Google Calendar checks `expires_at`
- If expired or within 5 minutes of expiry: call Google token refresh endpoint, update row in `google_oauth_tokens`
- User never sees this happen

---

## Calendar Button — States

Located in trip header alongside Print Trip button. Equal visual prominence — both outline buttons. Warning color (`var(--gold)` background, navy text) in State 3.

### State 1 — Unconnected
```
[ Calendar        ]
  Unconnected
```
- Style: outline button, normal
- Click: opens Connection Modal

**Connection Modal:**
- Field: Calendar name (default: trip name, editable)
- Button: "Connect Google Calendar" → initiates OAuth
- Note: "You'll be asked to sign in to Google and grant calendar access."

### State 2 — Connected
```
[ Calendar        ]
  ✅ Connected
```
- Style: outline button, normal
- Click: opens Management Modal

**Management Modal:**
- Display: calendar name, last synced timestamp ("Last updated Oct 3, 2:14 PM")
- Button: "Update All" → triggers full trip push with progress UI
- Button: "Rename Calendar" → inline rename field
- Button: "Clear Calendar" → removes all events from Google Calendar, resets all gcal_event_ids and gcal_dirty flags (confirmation required — destructive)
- Button: "Disconnect" → removes token, resets connection state (confirmation required)

### State 3 — Update Required
```
[ Calendar        ]
  Update
```
- Style: warning state — gold background (`var(--gold)`), navy text
- Click: opens Progress Modal immediately and begins push (no summary step)

**Progress Modal:**
```
Syncing calendar...  ████████░░░░░░░  14 of 31

Creating "Vancouver → Kamloops · Rocky Mountaineer"... ✅
Updating "Post Hotel · Check-in"... ✅
Deleting stale Banff transport event... ✅

┌─────────┬─────────┬─────────┐
│ Creates │ Updates │ Deletes │
│   12    │    3    │    1    │
└─────────┴─────────┴─────────┘
```
- Progress bar: overall count
- Running log: live per-event status
- Stats table: cumulative creates / updates / deletes
- On completion: modal shows "✅ Calendar up to date" + close button; button reverts to State 2

---

## Section-Level Push

Each calendar-enabled section header gets a small secondary push action alongside the existing "+ Add [Item]" button area. Exact placement TBD at build time — likely a small text button or icon button ("Sync section").

Section-level push uses the same progress modal pattern as trip-level, scoped to that section's records only.

Sections with section-level push:
- Flights
- Hotels
- Transportation
- Restaurants
- Itinerary
- Checklist

---

## Event Shapes

### Timezone resolution
Helm's existing `TRIP_CITIES` map is used for all city-based timezone assignment:
- Honolulu: `Pacific/Honolulu`
- Vancouver / Kamloops: `America/Vancouver`
- Jasper / Lake Louise / Banff: `America/Edmonton`

Checklist events (planning phase): `Pacific/Honolulu`

### Flights
One event per leg (not per booking).
- **Title:** `[Airline] [Flight#] · [Origin] → [Destination]`
- **Start:** departure datetime, origin city timezone
- **End:** arrival datetime, destination city timezone
- **Description:** confirmation number, booking reference, terminal/gate if stored
- **gcal columns:** `gcal_event_id`

### Hotels
Two point-in-time events per hotel record.
- **Check-in title:** `[Hotel Name] · Check-in`
- **Check-in:** check-in date at 15:00 local, hotel city timezone
- **Check-out title:** `[Hotel Name] · Check-out`
- **Check-out:** check-out date at 11:00 local, hotel city timezone
- **Description:** address, booking reference, confirmation number
- **gcal columns:** `gcal_checkin_event_id`, `gcal_checkout_event_id`

### Transportation
One event per segment.
- **Title:** `[Origin] → [Destination] · [Carrier/Mode]`
- **Start:** departure datetime, origin city timezone
- **End:** arrival datetime, destination city timezone (if stored; else duration-based)
- **Description:** booking reference, confirmation, notes
- **gcal columns:** `gcal_event_id`

### Restaurants
One point-in-time event.
- **Title:** `[Restaurant Name] · Dinner` (or meal type if stored)
- **Start:** reservation datetime, restaurant city timezone
- **Duration:** 2 hours default
- **Description:** address, party size, reservation notes, confirmation
- **gcal columns:** `gcal_event_id`

### Itinerary
One event per activity row.
- **Title:** `[Activity title]`
- **Start:** activity datetime, activity city timezone
- **Duration:** if stored; else 1 hour default
- **Description:** description, location, notes
- **gcal columns:** `gcal_event_id`

### Checklist
Two events per item (when `due_date` is set).
- **Due event title:** `[Task] · Due`
- **Due event:** all-day event on `due_date`, `Pacific/Honolulu`
- **Warning event title:** `⚠️ [Task] · Due in [warning_days] days`
- **Warning event:** all-day event on `due_date - warning_days`, `Pacific/Honolulu`
- Only created when `due_date` is not null
- Warning event only created when `warning_days` is not null
- **gcal columns:** `gcal_due_event_id`, `gcal_warning_event_id`

---

## API Routes (new)

| Route | Method | Purpose |
|---|---|---|
| `/api/gcal/auth` | GET | Initiates OAuth — redirects to Google |
| `/api/gcal/callback` | GET | Handles OAuth return, stores tokens |
| `/api/gcal/calendar` | POST | Creates new Google Calendar, stores `gcal_calendar_id` |
| `/api/gcal/calendar` | PATCH | Renames calendar |
| `/api/gcal/calendar/clear` | POST | Deletes all events, resets all gcal fields |
| `/api/gcal/push/trip/[tripId]` | POST | Pushes all sections (SSE) |
| `/api/gcal/push/[section]/[tripId]` | POST | Pushes one section (SSE) |
| `/api/gcal/status/[tripId]` | GET | Returns connection state + dirty count for button state resolution |

### SSE push response shape
Push routes (`/api/gcal/push/*`) use Server-Sent Events to stream progress:
```
event: progress
data: { current: 14, total: 31, action: "create", label: "Vancouver → Kamloops · Rocky Mountaineer", status: "success" }

event: stats
data: { creates: 12, updates: 3, deletes: 1 }

event: complete
data: { synced_at: "2026-10-03T14:14:00Z" }
```

---

## Offline Behavior

Calendar push is online-only by design. If the device is offline:
- Calendar button is visually disabled (greyed out)
- Tooltip / subtitle: "Unavailable offline"
- No modal opens
- No error state triggered

---

## UI — Form Field Standards

Per working rule established this session: all new form fields get deliberate labels and placeholder text at build time.

| Field | Label | Placeholder |
|---|---|---|
| Calendar name | "Calendar name" | "Canadian Rockies Adventure" |
| warning_days (Checklist) | "Warning (days before)" | "7" |

---

## Open Issues Generated This Session

| # | Area | Issue |
|---|---|---|
| 7 | Offline UX | Detect offline state, show banner, hide Edit/Save/Delete controls. Deferred. |
| 8 | Existing sections | Retrofit descriptive labels and placeholders across all existing section forms. Deferred. |
| 9 | Tooltips | Mac/hoverable tooltip pass across all sections. Deferred post-labels retrofit. |
| 10 | Trip header actions | Import Document status — confirm whether feature is still active or can be removed. |

---

## Build Sequence (proposed)

1. Google Cloud Console setup (Stan, manual)
2. SQL — schema changes (Stan runs in Supabase)
3. OAuth flow (`/api/gcal/auth` + `/api/gcal/callback` + token storage)
4. Calendar create/rename/clear routes
5. Calendar button component — 3 states + status API
6. Push logic — per section event builders + upsert logic
7. SSE push routes (trip-level + section-level)
8. Progress modal UI
9. Section-level push buttons
10. Dirty flag wiring — 6 update routes
11. Offline button disable
