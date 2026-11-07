# Re-import picks up changes (A4) — plan

2026-11-05 — Claude Code (Opus 5.5). Status: **built 2026-11-05 as v00.04.0037; tested by Stan on localhost 2026-11-06 ("Everything good").** Not committed. D1–D7 accepted by Stan (recommendations). The migration change went into `202611050002_import_trip_document.sql` (still uncommitted) instead of a new file; re-run it. Also fixed while building: flag Fix/Edit values weren't applied to the saved data; transfer and restaurant times were saved without their timezone.
Follows `docs/import-fix-plan.md` (v00.04.0032–0036), task A4.

## 1. Goal

Stan re-imports a booking when it changes, for example an airline's updated
itinerary with new flight times. Today an import only adds, so the flight is
duplicated. Instead, Helm should recognise bookings already on the trip, show
what changed field by field (old → new), and let Stan **Accept** or **Skip**
each change. Nothing changes without his say-so.

## 2. What counts as "the same booking"

Matching runs for the four booking sections (the ones with confirmation numbers):

| Section | Matches an existing record when… |
|---|---|
| Flights | same flight number (spaces and case ignored) **and** either the same confirmation number or the same departure date |
| Hotels | same confirmation number, or same hotel name and check-in date |
| Transfers | same confirmation number and type, or same origin, destination and departure date |
| Restaurants | same confirmation number, or same name and reservation date |

Only live records (not deleted) on this trip are considered. Names are compared
ignoring case, spaces and punctuation. Dates are compared as local dates in the
record's own timezone.

For a flight that moved to another day, the confirmation number still matches it.
A flight whose number changed (e.g. an equipment swap) won't match and is added as
new, with a flag on the review page if another flight on the trip has the same
confirmation number and route ("Possibly replaces AC 123").

Itinerary items and Key Info have no booking reference, so they aren't matched.
Exact repeats are skipped instead: an itinerary item with the same day, title and
start time, and a Key Info item with the same label and value (§5 D6).

## 3. How it works

1. **Import** (unchanged): Claude reads the document; the preview opens.
2. **Find matches (new).** The review page sends the preview to a new
   `POST /api/trips/[id]/import/matches` (signed in, trip advisor only, read-only). For
   each imported booking it returns either *new*, *same, no changes*, or
   *changes* with the existing record's id and the fields that differ. Values are
   compared after the same normalisation the save uses (timezone lookups, times as
   instants, airport codes upper-case). An imported field that's empty never
   counts as a change: an import never clears existing data (D3).
3. **Review page (new section "Changes to bookings already on this trip").** One
   card per matched booking, e.g. *Flight AC 123 · Sat 3 Oct*, listing each changed
   field as old → new with **Accept** / **Skip** (44pt), plus **Accept all** /
   **Skip all** on the card and **Add as a new booking instead**. Bookings with no
   changes are listed in one line ("2 bookings already on this trip, no changes").
   The existing flags and sections work as now. The Confirm button counts
   unreviewed changes like it counts unresolved flags (D2).
4. **Confirm.** Accepted changes go to the server as
   `updates: [{ section, id, fields }]`; matched bookings are left out of the inserts
   (unless "add as new"). Everything is still one transaction in
   `import_trip_document`: inserts and updates are saved together, or nothing is.
5. **Saving an update** behaves like editing the booking by hand:
   - only the accepted fields change, and only columns on a fixed list per table
     (the same lists as the edit routes, e.g. `app/api/flights/[id]/route.ts`);
   - the record must belong to this trip and not be deleted, or the whole import
     stops with a clear message;
   - `gcal_dirty` is set when the booking is on the Calendar or has an event, as
     the edit routes do, so the next Calendar sync moves the event;
   - `updated_at` is set by the existing trigger, so devices pick up the change
     (offline editing compares it);
   - if a changed date has no itinerary day, a day is inserted (as for any save);
   - for flights, a changed airport looks its timezone up again; a changed time is
     interpreted in the flight's timezone.

## 4. Files

- New `app/api/trips/[id]/import/matches/route.ts` and `lib/import/matching.ts`
  (match keys, normalisation, field comparison; shared with confirm so both
  normalise the same way).
- `app/api/trips/import/confirm/route.ts`: build `updates`, skip matched inserts,
  re-check update ids.
- `supabase/migrations/2026110X0001_import_updates.sql`: `import_trip_document`
  gains the `updates` part and the itinerary-item / Key Info repeat check
  (`create or replace`, same grants).
- `app/advisor/trips/[id]/import/review/page.tsx`: the Changes section.
- Changelog, version.

## 5. Decisions (Stan accepted all recommendations, 2026-11-05)

| | Question | Decision |
|---|---|---|
| D1 | Match rules as in §2? | **Yes.** Confirmation number plus flight number covers schedule changes, including a move to another day. |
| D2 | A change you don't review before Confirm: accepted or skipped? | **Skipped**, with the Confirm button saying "Confirm (3 changes not reviewed will be skipped)". Nothing changes unless you accept it. |
| D3 | The document leaves a field empty that the booking has filled (e.g. seat number): clear it? | **Never clear.** Only values the document actually has can change a booking. |
| D4 | One imported booking matches two on the trip (e.g. duplicates from earlier imports): what then? | **Ask on the card:** "This matches 2 bookings. Which one does it update?" with each listed, plus Add as new. |
| D5 | Bookings that match and haven't changed: show them? | **One summary line**, not a card each. |
| D6 | Skip exact repeats of itinerary items and Key Info on re-import? | **Yes.** |
| D7 | A booking on the trip that's missing from the new document (perhaps cancelled): flag it? | **Not now.** A document often covers only part of a trip, so a missing booking usually means nothing. Could be a later task. |

## 6. Database impact

- The matches endpoint reads `flights`, `hotels`, `transportation`, `restaurants`
  for one trip (`trip_id`, `deleted_at is null`), the same queries the sections
  already run. No new query pattern or index.
- Updates are rare (once per re-import), go through the existing `updated_at`
  trigger, and use no Realtime. No new table or column. One `create or replace`
  of `import_trip_document`, which Stan applies.

## 7. Testing (localhost, Mac)

1. Import the United C4ZKTP eTicket into a test trip; then import it again: the
   review page shows its flights as "already on this trip, no changes"; Confirm
   adds nothing to Flights.
2. Edit one flight's departure time on the trip, then re-import: the card shows
   the time change (old → new); Accept → the flight shows the document's time;
   Skip → unchanged. With the flight on the Calendar, the next sync moves the event.
3. Accept one field and skip another on the same card; leave a third unreviewed:
   only the accepted field changes.
4. Make two copies of a flight, re-import: the card asks which one to update.
5. Force a failure (delete the matched flight in another tab before Confirm):
   "Nothing was imported" with the reason; the trip is unchanged.
6. iPad and iPhone: the Changes cards and buttons at 44pt.
