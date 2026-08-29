# Day-attached itinerary Time TBD

## Problem

Itinerary rows belong to a dated day through `day_id`, but the edit form exposes a
separate timestamp date without explaining the distinction. New rows prefill the
timestamp date; leaving its time empty then triggers incomplete-timestamp
validation. There is no explicit way to say that an item belongs to a known day
while its time remains unknown.

## Approved behavior

- Add a `Time TBD` checkbox for non-all-day itinerary rows.
- A TBD row remains attached to its existing itinerary day through `day_id` while
  `start_time`, `end_time`, and their timezones remain null.
- Show the attached itinerary date in the form while TBD is selected.
- Disable and clear timestamp inputs, estimated-time state, and Calendar inclusion
  while TBD is selected.
- Existing non-all-day rows with no `start_time` automatically open and display as
  TBD; no backfill or new database column is required.
- Display `Time TBD` on the Itinerary page, Daily 3×5 cards, and full-size packet.
- Keep TBD rows after timed rows within their attached day.
- Persist `gcal_include` and matching dirty state when creating new timed rows; the
  create endpoint currently omits that submitted field.

## Data repair

- Move the active untimed `Jasper Skytram` row from Oct 9 to Oct 8.
- Do not restore any reference-trip entries for Oct 8.

## Database impact

- One bounded update moves the existing Jasper Skytram row to the correct `day_id`.
- No new table, column, query pattern, index, RLS policy, Realtime subscription, or
  high-frequency write is introduced.

## Approval

Approved by Stan on 2026-08-26.

## Verification

- Confirmed the current TBD set is `Jasper Skytram` on Oct 8 plus `Ice Explorer`,
  `Alpine Lunch`, and `Glacier Skywalk` on Oct 9; each is non-all-day, untimed,
  Calendar-excluded, and clean.
- `npx tsc --noEmit` passed.
- Focused ESLint passed for the Itinerary client, create endpoint, and print page.
- `npm run build` passed on Next.js 16.2.5 after rerunning outside the sandbox
  because Turbopack's internal worker port was blocked in the sandbox.
- `git diff --check` passed.
