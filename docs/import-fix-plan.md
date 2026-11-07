# Import Document — fix plan

2026-11-05 — Claude Code (Opus 5.5). Status: **built 2026-11-05 as v00.04.0032–0036; tested by Stan on localhost 2026-11-05/06.** Migration `202611050002_import_trip_document.sql` must be applied before testing. Not committed.

## 1. What the import does today

Trip sidebar **Import Document** → drop zone in `components/advisor/TripDetailView.tsx` →
`POST /api/trips/import` (`app/api/trips/import/route.ts`, Edge runtime) extracts text
(PDF via `pdf-parse`; .txt/.md/.json as is; .docx by scanning bytes) and streams it to
Claude (`claude-sonnet-4-6`, 32,000 tokens out, 80,000 characters in) for JSON per section
plus `unmapped` and `flags` → the result goes to `sessionStorage` → review page
`app/advisor/trips/[id]/import/review/page.tsx` (Fix / Edit / Keep / Delete per flag) →
`POST /api/trips/import/confirm` (`app/api/trips/import/confirm/route.ts`) inserts with the
service-role key, section by section, then records an `import_jobs` row.

Built 2026-04-02 to 04-06. Since then only the itinerary-link (00.04.0004–0005) and
timezone (00.04.0022) changes touched it. Packing and Checklist were rebuilt
after that (00.04.0011–0021) without updating the import.

## 2. Problems

| # | Problem | Effect |
|---|---|---|
| P1 | **No sign-in or membership check** on either route. `proxy.ts` matches only `/advisor` and `/traveler`; neither route reads the session. Confirm takes `tripId` and `userId` from the request body. | Anyone with the URL can spend Anthropic credit (`/import`) and write rows into **any** trip with the service-role key (`/confirm`). |
| P2 | **Packing writes to `packing_items`**, a table dropped in April (Apr07c handoff). Real table is `packing` (`item`, `category`, `person`, `group_id` → `packing_groups`, sub-groups, `owned`, `packed`). | Any import with packing items fails at that step. |
| P3 | **Checklist writes to `checklist_items`** with `label`, `completed`, `owner_role`, `time_horizon`. Real table is `checklist` (`task`, `group_name`, `status: 'open' \| 'completed'`, `due_date`, `notes`…). | Any import with checklist items fails at that step. |
| P4 | **Not all-or-nothing.** Confirm inserts days, rows, flights, hotels, transfers, restaurants, Key Info, Packing, Checklist one after another and returns at the first error. | P2/P3 leave a half-imported trip (days and travel records saved, the rest not) with no undo, and a retry duplicates what was saved. |
| P5 | Errors go to `error_log` (not used anywhere else); the logs policy says `helm_logs` via `lib/logger.ts`. Claude errors in `/import` only reach `console`. | Import failures don't show in Logs. |
| P6 | Prompt still describes the old shapes (checklist `title`/`time_horizon`, packing `name`/`quantity`, no person, no groups). Model is `claude-sonnet-4-6`. | Even after P2/P3, Claude returns fields with nowhere to go. |
| P7 | `.docx` text comes from a raw byte scan (TODO: `mammoth`). A .docx is a zip, so this mostly yields garbage. | Word files import poorly or not at all. |
| P8 | **AI errors aren't handled.** `/import` returns its streaming `Response` (HTTP 200) before Claude has answered, so a Claude refusal (credits used up, bad key, overloaded, rate limit) arrives as a broken stream (`controller.error`) with no message the client can read. | Out of credits, the import fails with a meaningless error, and nothing says credits are the cause. |
| P9 | **Losing the connection partway isn't handled.** Import is already dimmed offline in the sidebar (`needsConnection`), but if the connection drops during the upload or the Claude step, or on the review page, the plain `fetch` fails with a generic error. The review page doesn't check `useIsOnline()`, so Confirm stays enabled offline. | Confusing errors. The preview survives in `sessionStorage`, so nothing is lost, but Stan isn't told that. |

Out of scope here; see §7 (task A2).

## 3. Proposed fix

**Step 1 — Auth (P1).** Both routes: `getAuthUserId()` (same helper pattern as
`app/api/trips/[id]/flights/route.ts`, including `BYPASS_AUTH_USER_ID`) → 401 if none;
`trip_members` check for `tripId` → 403 if not a member. Confirm uses the session user,
never `userId` from the body. Check that `cookies()` works under the Edge runtime in this
Next version (`node_modules/next/dist/docs/`); if not, or if `pdf-parse` needs Node,
move `/import` to the Node runtime with `maxDuration = 60` and keep the streaming.

**Step 2 — Prompt and model (P6).** New output shapes:
- `checklist_items: { task, group, due_date?, notes? }`
- `packing_items: { item, category, sub_group? }`

Update the model id (proposal: `claude-sonnet-5-5`; check the current id and price
before building). Keep the flag contract unchanged.

**Step 3 — Packing (P2).** Insert into `packing` with `person: 'stan'` (§4 D1; no
picker on the review page). Categories and sub-groups are matched by name to the person's
existing `packing_groups` / `packing_subgroups` and created when missing, the same
merge rule as `copy_packing_list`. Items already present with the same text in the
same place are skipped. `owned` and `packed` start false.

**Step 4 — Checklist (P3).** Insert into `checklist` with `task`, `group_name` (from
`group`, matched to `checklist_groups` by name the way Checklist copy does),
`status: 'open'`, optional `due_date` and `notes`, `gcal_include: false`.

**Step 5 — All-or-nothing (P4).** Confirm does every timezone lookup and builds every
row first, then makes **one** call to a new Postgres function
`import_trip_document(p_trip_id, p_payload jsonb)` (`security definer`, service_role
only, one transaction), modelled on `copy_packing_list`
(`202610310001_copy_packing_list.sql`). If anything fails, nothing is saved, and the
review page keeps the preview so Stan can retry. `import_jobs` row written inside the
same transaction. Linked-itinerary days (`ensureDaysForLinkedRecord`) move into the
function as "insert day for date if missing".

**Step 6 — Logging (P5).** Replace `error_log` with `logger.error('api/import…', …)`
in both routes (try/catch only, per the logs policy).

**Step 7 — Word files (P7).** Add `mammoth` for .docx (§4 D3).

**Step 8 — AI errors, including credits used up (P8).** Same approach as Orb's
ORB-228 handling (Knowledge `44f3993a…`, which worked on its first real activation).
- `/import` waits for Claude's first event before returning the streaming response,
  so an error raised before any text comes back as JSON with a status and a `code`:
  - `ai_credits`: the Anthropic error message contains "credit balance" or "billing".
    Message: "Import isn't available: the AI service has run out of credits. Add credit
    in the Anthropic console, then try again."
  - `ai_busy` (429 / 529 overloaded): "The AI service is busy. Try again in a few minutes."
  - `ai_not_configured` (no `ANTHROPIC_API_KEY`, or 401): "Import isn't set up on this
    server." This replaces today's raw "ANTHROPIC_API_KEY is not set."
  - `ai_error` (anything else): "The AI service couldn't read this document." plus the
    provider's message in Logs only.
- An error after text has started streaming ends the stream with a final marker line
  (e.g. `\n\u0000HELM_IMPORT_ERROR {json}`), which the client checks before parsing
  the JSON, and shows the same messages.
- The import modal shows the message in its error state, with **Try Again** for
  `ai_busy` and `ai_error` only (retrying `ai_credits` or `ai_not_configured` can't help).
- Every case is written to `helm_logs` with `logger.error` and the `code`, so Logs shows
  "credits" at a glance. No email or ticket: Stan is the only user and sees the message.
- DEV panel: an **Import AI error** choice (off / credits / busy / not configured) that
  makes `/import` return that error without calling Claude, so each path can be
  tested on localhost without spending credit. Development only.

**Step 9 — Connection (P9).** Import needs a connection throughout: text extraction
and Claude both run on the server, and Confirm writes to the database. There is no
offline import and no queuing in the outbox.
- Keep the sidebar's `needsConnection` dimming.
- Import modal: if the connection drops before or during the upload or Claude step,
  show "Connection lost. Reconnect, then try again" (wording as in 00.04.0030) instead
  of the fetch error.
- Review page: disable **Confirm** while offline (`useIsOnline()`) with "Reconnect to
  save this import". The preview stays in `sessionStorage`, so Stan can confirm once
  he's back online. A Confirm that fails for lack of connection says the same thing,
  and nothing is saved (Step 5's transaction).

**Release:** patch bump per change, changelog entry, HANDOFF update.

## 4. Decisions (Stan, 2026-11-05)

| | Question | Decision |
|---|---|---|
| D1 | Packing is per person. Who gets imported packing items? | **Stan only.** No person picker on the review page. |
| D2 | Make the confirm step all-or-nothing with a new database function (Step 5), or just fix P2/P3? | **Database function** (accepted). |
| D3 | Add `mammoth` for Word files now? | **Yes, now** (accepted). Step 7 is in scope. |
| D4 | Model: move to the current Sonnet? | **Yes**, after checking the id and price (accepted). |

## 5. Database impact

- New function `import_trip_document` (one migration, idempotent `create or replace`,
  `revoke` from public/anon/authenticated, grant to service_role). Stan applies it.
- No new table, column, index or Realtime. Writes happen once per import (rare).
- `packing`, `checklist`, the group tables and the itinerary tables are already
  queried by `trip_id`; inserts add no new query pattern.

## 6. Testing (localhost, Mac; needs `ANTHROPIC_API_KEY` in the secrets store)

1. Signed out: both routes return 401. Signed in on a trip you're not a member of: 403.
2. Import a PDF with flights, hotels, a restaurant, packing and checklist items into a
   test trip: every section lands; Packing goes to the chosen person(s) under matching
   categories; Checklist items are open under their groups.
3. Re-import the same document: no duplicate packing items; review page warns about
   re-import as it does today.
4. Force a failure (e.g. an invalid date in an edited flag): confirm reports the error
   and the trip is unchanged.
5. .docx and .txt files (D3).
6. AI errors: with each DEV panel **Import AI error** setting, Import shows the right
   message, offers Try Again only where it helps, and writes a `helm_logs` entry with the code.
7. Connection: Simulate Offline (or Wi-Fi off) during the Claude step → "Connection
   lost"; on the review page → Confirm disabled with the reconnect message; back
   online → Confirm works with the preview intact.
8. iPad and iPhone: Import Document, review, confirm at 44pt targets (Bonjour URL).

## 7. Tasks after this fix (Stan, 2026-11-05)

Each gets its own plan and go-ahead once the import fix is done.

- **A1 — Hide Cathy.** *Built 2026-11-06 as v00.04.0038 (`lib/packing/people.ts`, `VISIBLE_PACKING_PEOPLE`); tested by Stan 2026-11-06.* Cathy isn't used. Hide her everywhere she appears (Packing
  Stan / Cathy tabs, Copy to Trip and Move people choices, anything else that offers
  her), but **remove nothing**: keep the `person` column, the `'cathy'` value, her
  rows and the code paths. She may become part of a real Users implementation later.
  Prefer one switch over scattered deletions so she can be shown again.
- **A2 — Print page checklist.** `app/advisor/trips/[id]/print/page.tsx:63` reads the
  old `checklist_items` table with `is_completed`; it should read `checklist`
  (`status <> 'completed'`, `deleted_at is null`). The printed checklist is probably
  empty today; confirm on localhost before and after.
- **A3 — Dashboard Archive / Clear route (security).** Found 2026-11-05 while fixing
  the import record. `POST /api/trips/[id]/clear` (Archive, Download & Clear,
  Discard on the dashboard) has **no sign-in or membership check** and hard-deletes
  every section's rows for whatever trip id it's given. It also uses tables Helm no
  longer uses (`packing_items`, `checklist_items`), so Packing, Checklist, their
  groups and Key Info groups are left behind; it reads `import_jobs.section_counts`
  / `flag_resolutions`, which don't exist (the real column is `result_json`), so
  the import record is never archived; and it ignores Google Calendar events.
  Needs its own plan: auth, the current tables, one transaction, Calendar cleanup,
  and what Archive should keep.
- **A4 — Re-import picks up changes (Stan, 2026-11-05).** Re-importing a booking
  (e.g. an airline's updated itinerary) should find records already on the trip and
  show what changed, field by field, so Stan can accept or skip each change instead
  of getting a duplicate. Example: a flight's new departure time. Needs its own plan:
  how a match is found (confirmation number plus flight number and date for flights;
  similar keys for hotels, transfers, restaurants), how changes appear on the review
  page (old → new, Accept / Skip, alongside the existing flags), and how accepted
  changes are saved (updates inside `import_trip_document`, `updated_at` and Calendar
  dirty flags as an edit would set them). Until then an import only adds, so
  importing the same booking twice duplicates it. The re-import dialog was removed
  in 00.04.0036 at Stan's request.
- **A5 — Bulk selection on every list page (Stan, 2026-11-06).** Plan first, for
  Stan's approval before anything is built. Add selection to Itinerary, Flights,
  Hotels, Restaurants, Transportation, Checklist, Packing and Key Info (Overview and
  Logs excluded unless they fit). The plan proposes which bulk actions to offer
  (e.g. delete, copy to another trip, include in or remove from Google Calendar,
  mark complete) and how selection works by touch on iPad and iPhone (44pt targets,
  no hover); Packing and Checklist already have multi-select
  (`docs/packing-multi-select-plan.md`, `docs/checklist-packing-parity-plan.md`), so
  reuse that pattern. Consider making Copy to Trip (which Packing and Checklist
  already have) one of the bulk actions, so all sections share the same copy code.
  Include the database impact (new query patterns, bulk write size, indexes) and
  whether it ships as one release or two.
