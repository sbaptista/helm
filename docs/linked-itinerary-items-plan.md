# Travel records shown in the Itinerary (one-way link) — plan

**Status:** Approved and built 2026-10-26 as `00.04.0004` (typecheck and lint
clean). Tested by Stan on localhost 2026-10-29 (with Revision 1). Migration
`supabase/migrations/202610260001_show_in_itinerary.sql` was applied by
Stan on 2026-10-27 and verified (all four tables have `show_in_itinerary`).

As built, beyond the plan:
- Tapping a linked item opens the record's **edit form** in its section
  (`openSourceRecord`, kept from August), not just a highlight.
- `lib/itinerary/linked-entries.ts` restored from `563666a`, filtered by
  `show_in_itinerary`; `ensureDaysForLinkedRecord` runs after every create
  and update in the eight section routes and after the import.
- The 8.5×11 packet now formats every itinerary time with the trip's zoned
  formatter (as the 3×5 cards already did). It used to cut the hour out of
  the stored UTC timestamp, which printed hand-made rows in UTC too.
- If a day is deleted, its linked items are hidden until the record is saved
  again (which re-inserts the day); Helm never deletes days itself.
**Target version:** next 00.04.x patch.
**Author:** 2026-10-26 — Claude Code (Opus 5.5)

## Request (Stan, 2026-10-26)

Tie Flights, Hotels, Transportation, Restaurants (etc.) to the Itinerary.
Today each fact is entered twice, once in its section and once as an
itinerary item. Make it one way, from object to itinerary: the itinerary
lists, e.g., the flight, but every edit — including actions and Calendar
events — happens in the object. Hand-made itinerary items must still be
possible.

## History: Helm did this once, then removed it

- **v00.02.0048–0051 (2026-08-25, `563666a`):** every Flight, Hotel,
  Restaurant and Transportation record was projected into the Itinerary at
  read time, read-only, linking back to its source
  (`docs/linked-itinerary-projection-plan.md`; Knowledge `4bba13d8`).
- **v00.02.0055 / v00.03.0000 (same day, `7634aab`):** removed. Itinerary
  became "explicitly authored only" (`docs/separate-itinerary-plan.md`;
  Knowledge `a27452ca`).
- **No reason was recorded** — not in the plans, commits, handoff or
  Knowledge. The same session reconciled the Rocky Mountaineer document into
  explicit itinerary rows and noted "hotels/flights/restaurants are not
  duplicated", which suggests the automatic projection put too much into the
  Itinerary or clashed with the explicit rows. Stan doesn't remember the
  reason (2026-10-26); opt-in per record is the safeguard against both.

What survives from the first attempt: the per-occurrence timing columns
(`departure_is_all_day`, `check_in_is_approx`, …, migration
`202608240001`) are still on all four tables, and the projection utility
(`lib/itinerary/linked-entries.ts`, 170 lines) is recoverable from `563666a`.

## Proposed design (recommended options marked)

### Which records, which moments

| Source | Shown in Itinerary as |
|---|---|
| Flight | Departure (departure airport's local date/time) and arrival (arrival airport's local date/time) |
| Hotel | Check-in and check-out (their dates; times if set) |
| Restaurant | Reservation |
| Transportation | Pickup |

Checklist, Packing and Key Info are not included.

### Opt-in per record — recommended

Each of the four record types gets a **Show in Itinerary** checkbox next to
"Add to Google Calendar" (20px box, 44pt row). Only checked records appear.
This is the main difference from the August design, which showed everything.

- New records: checked by default (decided).
- Existing records: unchecked, so trips that already have hand-made
  duplicates (the Rockies trip) don't suddenly show everything twice.

### Read at display time, never copied

Linked items are computed from the source records whenever the Itinerary,
Overview or print views load. Nothing is stored in `itinerary_rows`, so an
edit, deletion or un-check in the source shows immediately and nothing can
drift. This is the one-way link.

### How a linked item looks and behaves in the Itinerary

- Listed with the hand-made items of its date, ordered by time; All Day and
  Time TBD as today.
- Marked with its section (✈️ Flight, 🏨 Hotel, 🍽 Restaurant, 🚐 Transfer)
  and a "From Flights" style label, so it is clearly not editable here.
- No edit, delete, action or Calendar controls on it. Tapping it opens the
  record in its own section, highlighted (`navigateTo(section, id)` already
  exists).
- Hand-made items work exactly as now, including their own Calendar opt-in.

### Calendar and actions stay with the record

- Google Calendar events come only from the source record's own
  "Add to Google Calendar". Linked items never sync from the Itinerary, so no
  double events. (Same rule as the August design.)
- Action Required lives on the record. The Overview already lists Hotel
  actions; Flight, Transportation and Restaurant actions are not listed there
  today, and adding them is out of scope unless Stan wants it.

### Dates with no itinerary day — decided: create the day

A trip has one itinerary day per date, and its dates come from those days.

- **Placeholder days stay allowed.** Stan often creates days early, before
  anything is booked. A linked item on that date simply joins the existing
  day; its title is untouched.
- **A record on a date with no day creates one.** When a record is saved with
  Show in Itinerary checked (or checked later, or created by the import),
  the server creates an itinerary day for each of its dates that lacks one,
  titled **[Inserted from flight]** (or hotel, restaurant, transfer). Stan
  renames it later. Flights create up to two days (departure and arrival
  dates), hotels up to two (check-in and check-out).
- **Trip dates need no change:** they stay derived from itinerary days
  (`lib/trip-range.ts`), and the inserted day brings the record's date into
  the range.
- **Leftovers:** if the record is later deleted, unchecked or moved to another
  date, the inserted day stays, as any day would; Stan deletes it if unwanted.
  Helm never deletes a day on its own.

### Everywhere the Itinerary appears

Itinerary screen; Overview Trip Timeline (dates, item counts) and its first
card's Today/Next label; 8.5×11 packet; 3×5 daily cards; trip dates on the
dashboard, header and print (through the inserted days).
Search keeps finding the record in its own section only, so no duplicates.

### Import

The document import currently creates both itinerary items and travel
records, which is the duplication this removes. It would stop creating
itinerary items for flights, hotels, restaurants and transfers, and set Show
in Itinerary on the records it creates.

### Existing duplicates

Trips that already have hand-made itinerary items for their flights and
hotels keep them (existing records start unchecked). Stan cleans up a trip by
checking Show in Itinerary on its records and deleting the hand-made copies.
No automatic matching.

## Database impact

| Question | Answer |
|---|---|
| New query pattern? | Itinerary, Overview and print read the four tables by `trip_id`, active rows only, as the August design did. Saving a linked record looks up `itinerary_days` by `(trip_id, day_date)`, the same lookup as the one-day-per-date check. Small row counts; no new index. |
| Realtime? | No. Source saves already call `router.refresh()`. |
| Frequent writes? | No. Ordinary form saves, plus at most two day inserts when a linked record lands on new dates. |
| New table? | No. |
| New column? | `show_in_itinerary boolean not null default false` on `flights`, `hotels`, `transportation`, `restaurants` (default false keeps existing rows unchecked; the forms default new records to checked). Not used in an index-worthy `WHERE`. |

One migration, applied by Stan in the Supabase SQL editor, plus the matching
`copy_trip` change so a copied trip keeps the setting.

## Decisions (Stan, 2026-10-26)

1. August removal reason: not remembered; go with opt-in per record.
2. New records default to **Show in Itinerary checked**; existing records
   start unchecked.
3. A record on a date with no itinerary day **creates the day**, titled
   "[Inserted from flight]" etc.; placeholder days created early stay
   allowed.
4. Flights show **departure and arrival** as two items.

## Verification (once built)

- A checked flight shows on its departure and arrival dates, opens the flight
  when tapped, and disappears when unchecked or deleted; no Calendar event
  is created from the Itinerary.
- Hand-made items unchanged, including their Calendar opt-in.
- Overview timeline, Today/Next card, packet and 3×5 daily cards include
  linked items; search shows no duplicates.
- A flight on a date with no day creates "[Inserted from flight]" days for
  its departure and arrival dates; an existing placeholder day keeps its
  title; trip dates follow.
- Mac, iPad and iPhone: tap targets, legibility of the source label.

---

## Revision 1 — Stan's test results (2026-10-29)

**Status:** Approved and built 2026-10-29 as `00.04.0005` (typecheck and lint
clean). Tested by Stan on localhost 2026-10-29.

**As built — different approach for §2, same result:** instead of moving each
form into a new `*EditSheet` component, each section component got a
**form-only mode** (`formOnlyRecordId`, `onFormOnlyDone`): given one record it
renders just that record's edit sheet. The Itinerary renders the section in
that mode. There is still exactly one form per record type, and the sheet
markup moved within its file unchanged (verified byte-for-byte), so the
sections' own add/edit flows are untouched. In form-only mode a section skips
its warning count and tab hand-off, and closing the sheet (cancel, save or
delete) returns to the Itinerary. Each section also syncs its list from
refreshed server data. Inserted days use `INSERTED_DAY_TITLE` in
`lib/itinerary/linked-entries.ts`.

### 1. An inserted day must not take on the record's identity

**Found:** an inserted day got a flight title ("[Inserted from flight]") and
the `flight` day type, which shows ✈️ and the flight colour. A day can hold
flights, hotels and restaurants alike; whichever record happened to create it
shouldn't define it.

**Fix:** inserted days get a neutral title, **[Inserted day]**, and no day
type (shown with the plain 📅 icon, as imported days without a type already
are). Stan renames it and sets its type when he knows what the day is.
Days already inserted during testing keep their old title and type; edit or
delete them by hand.

### 2. Edit linked records in place, without leaving the Itinerary

**Found:** tapping a linked item switched to the record's section and opened
its edit form there.

**Fix:** tapping opens the **same edit form** (Flight, Hotel, Restaurant or
Transportation) as a sheet over the Itinerary. Saving, deleting or unchecking
Show in Itinerary updates the Itinerary immediately; the user never leaves
the page. Linked items stay non-editable in the Itinerary itself.

**How:** today each section's edit form is built into its section component
together with the list. Each form moves into its own component —
`FlightEditSheet`, `HotelEditSheet`, `RestaurantEditSheet`,
`TransportationEditSheet` — used by both its section and the Itinerary, so
there is still exactly one form per record type.

- The Itinerary already loads the linked records (to list them), so it passes
  the full record to the sheet; no extra query.
- After a save or delete: `router.refresh()`, as the sections do now. Each
  section also takes the refreshed records from the server (the same
  prop-to-state sync the Itinerary got in 00.04.0004), so an already-open
  Flights tab doesn't show stale data.
- Behaviour inside each form is unchanged: validation, Action Required,
  Calendar, Show in Itinerary, delete confirmation.

**Risk:** moving four forms touches every section's add and edit. Retest
adding, editing and deleting in Flights, Hotels, Restaurants and
Transportation, as well as from the Itinerary.

**Database impact:** none. No new query, column or write path.
