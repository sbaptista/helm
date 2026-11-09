# Map pictures: the person decides, per trip

**Status:** approved by Stan 2026-11-08 ("Build it"); built as 00.04.0062, not tested.

Stan's request: "Let the user decide to turn map links into images."
Stan's answers (2026-11-08): the choice is per **whole trip**. Existing trips
keep their current state; new trips **ask** (or take the flag already set).

Interpretation (to confirm): existing trips show pictures today, so they stay
on. The Create Trip form asks with a switch. Copy Trip takes the source trip's
setting ("the flag that was set"). Edit Trip changes it at any time.

## Research summary

- Map pictures: `components/ui/MapTile.tsx` on Hotel cards
  (`HotelsClient.tsx:848`) and Restaurant cards (`RestaurantsClient.tsx:915`).
  Shown when the record has `map_lat`/`map_lng`, a well-formed `maps_url`, and
  the device is online (docs/links-and-map-tiles-plan.md §3).
- Trips are created in `components/advisor/CreateTripModal.tsx`, edited in
  `components/advisor/EditTripModal.tsx` (dashboard ⋯ menu and inside a trip,
  works offline through `apiFetch` and the offline store), and copied by the
  `copy_trip` function (latest version in
  `supabase/migrations/202611020001_place_timezones.sql`).
- Hotels and Restaurants are mounted by `HotelsSection.tsx`,
  `RestaurantsSection.tsx`, and inside `ItineraryClient.tsx` (a linked
  record's form opened over the Itinerary).

## Proposed steps (one version, 00.04.0062, or 0063 if Import from a web page ships first)

### 1. Migration `2026110800NN_trip_map_pictures.sql`
- `alter table public.trips add column if not exists show_map_pictures boolean not null default true;`
  Every existing trip gets `true`: nothing changes on its cards.
- `copy_trip` replaced (`create or replace`, same signature) to copy
  `show_map_pictures` from the source trip. No other change to it.
- Idempotent, with a check query in comments. Stan applies it.

### 2. Create Trip: ask
- A switch in `CreateTripModal`: label **Map pictures**, help text "Show a
  small map on Hotel and Restaurant cards. Tap it to open the map." 44pt row,
  on by default, sent with the new trip.

### 3. Edit Trip: change it
- The same switch in `EditTripModal`, set from the trip. Saved with title and
  destination through `PATCH /api/trips/[id]` (field added to its allowed
  list, boolean only), as a second request after title and destination.
  **Changed while building:** it needs a connection. Offline editing covers
  only title and destination (`OFFLINE_TRIP_FIELDS`, device copies,
  `useDeviceTrips`); carrying a third field through all of that wasn't worth
  it for a display setting. Offline the switch is disabled with "Connect to
  the internet to change map pictures."; title and destination still save.

### 4. Cards follow the trip
- The trip page reads `trip.show_map_pictures`; `TripDetailView` provides it
  through `MapPicturesProvider` (`components/ui/MapTile.tsx`), and `MapTile`
  returns nothing when it is false. One context covers Hotels, Restaurants and
  the Itinerary's linked forms without threading a prop through each.
- Off means the picture is hidden only: the **Map ↗** link, automatic map
  links and stored locations (`map_lat`/`map_lng`) are unchanged, so turning
  it back on shows pictures at once without new lookups. With it off, no
  `/api/map-tile` requests are made (no Static Maps cost).

### 5. Release
- Version bump, changelog entry, HANDOFF update, `types/trips.ts` field.

## DB impact
- One boolean column on `trips`, read with the trip (no new query pattern,
  never filtered on: no index). Written only from Create/Edit Trip: no write
  frequency concern. No new table, policy, or Realtime. `copy_trip` replaced.

## Verification
- Typecheck and lint; Claude checks in the browser pane on localhost: switch
  off in Edit Trip → no tiles on Hotels, Restaurants or the Itinerary's linked
  forms and no map-tile requests; on again → tiles return.
- Stan on Mac, iPad, iPhone: create a trip with the switch off; copy a trip
  with it off (copy stays off); offline, Edit Trip shows the switch disabled
  and still saves a title change.

## Approval
- [x] Stan approved building 2026-11-08.

## Progress
- 00.04.0062 built 2026-11-08: migration `202611080001_trip_map_pictures.sql` (not applied), `components/advisor/MapPicturesSwitch.tsx`, `MapPicturesProvider` in `components/ui/MapTile.tsx` provided by `TripDetailView`. The context also covers the Itinerary's linked Hotel/Restaurant forms. Typecheck and lint pass.
- Checked by Claude in the browser pane 2026-11-08 (migration applied by Stan): Test Delete trip, Edit Trip off → saved `false`, 0 pictures on Hotels and Restaurants, Map ↗ links kept, no `/api/map-tile` requests; on again → `true`, all 4 pictures load; New Trip sheet shows the switch on with its note (closed without creating). Then (same day): Simulate Offline → Edit Trip shows the switch disabled with "Connect to the internet to change map pictures." (cancelled, nothing saved); New Trip with the switch off created "Map pictures test" with `false`; Copy Trip of Test Delete (set off) made "Test Delete — Copy" with `false`, 0 pictures and 4 Map ↗ links; Test Delete set back on; both test trips deleted with Stan's OK. Not checked: iPad/iPhone.
