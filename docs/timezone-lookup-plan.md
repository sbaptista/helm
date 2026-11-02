# Timezones looked up from the place, worldwide (plan)

**Status:** draft for Stan's approval, 2026-11-02.
**Version:** to be set when built.

## Why

A Seattle hotel in "Test-Weekender, Cold Weather" with a 7 AM check-out showed **8 AM PDT** in the Itinerary.

- **The cause:** hotels and restaurants have no stored timezone. Helm looks the city up in a 7-city list (`lib/gcal/timezones.ts`), and any other city falls back to America/Vancouver. So Seattle got Vancouver's time.
- **Why it showed now:** BC switched to permanent UTC−7, which tz 2026b and later model from 2026-11-01, so Seattle and Vancouver no longer agree from November on.
- **The wider limit:** Flights, Transportation and Itinerary rows choose from 3 copies of a 4-option list (Honolulu, Seattle, Vancouver/Kamloops, Jasper/Banff), and only 6 airport codes are known. Helm only works for the Rockies trip. Ann Arbor or Japan would get the wrong time, and Calendar events would be wrong with it.

## How the big travel apps do it

They never ask for a timezone. The app works out where a booking is (from the airport code or the address), turns that into a timezone, and stores it with the booking. Helm will do the same, using Google's Geocoding and Time Zone APIs, which Stan has a pay-as-you-go key for.

The travel timezone rule from HELM-70 (Knowledge `1b08eb32`) is unchanged: keep the local date and time plus a timezone name such as `Asia/Tokyo`, show times in that place's timezone, and send Calendar the exact moment.

## Design

### 1. One lookup, on the server

- **New module `lib/geo/timezone-lookup.ts`, server only:**
  1. A place's text → Google Geocoding API → coordinates.
  2. The coordinates → Google Time Zone API → timezone name (`timeZoneId`, e.g. `America/Detroit`).
- **Key:** read from `GOOGLE_MAPS_API_KEY`. It is never `NEXT_PUBLIC_` and never reaches the browser.
- **Short time limit:** about 5 seconds. A failure returns "not found" and never blocks the save.
- **Results are stored on the record, so each place is looked up once.** Pages, printing, offline copies and Calendar sync never call Google.

### 2. When a lookup happens

- **When:** in the existing create and update routes, only when a record's location fields change, or its timezone is empty.
- **What decides a manual choice:** if the form sends a timezone the person chose, that is kept and no lookup runs.
- **Offline:** saves made offline are looked up when the outbox sends them, because the lookup runs on the server.

| Record | Looked up from | Stored in |
|---|---|---|
| Hotel | address, city, province, postal code, **country (new)** | `hotels.timezone` **(new)** |
| Restaurant | address, city, state/province, **country (new)** | `restaurants.timezone` **(new)** |
| Flight | each airport code (`"<code> airport"`) | `departure_timezone`, `arrival_timezone` (existing) |
| Transportation | origin and destination | `departure_timezone`, `arrival_timezone` (existing) |
| Itinerary row | location | `start_timezone`, `end_timezone` (existing) |

### 3. In the forms

- **No timezone picker by default.** A line under the time shows the result: "Timezone: Eastern — America/Detroit (EST)" or "Timezone: Japan (JST)". It updates after saving.
- **Change…** opens one shared picker:
  - The timezones this trip already uses first.
  - Then every timezone, grouped by region and searchable by city. The list comes from the browser (`Intl.supportedValuesOf('timeZone')`), so Tokyo, London and the rest are all there.
  - This replaces the 3 hard-coded copies.
- **When the lookup finds nothing:** the line reads "Timezone needed" with the picker. The item shows "Time zone unknown" instead of a wrong time, and nothing falls back to Vancouver any more.
- **A Country field** on Hotels and Restaurants, so places like "Kyoto" are found reliably. It's optional; it's left empty for US and Canadian addresses whose province or state makes the place clear.

### 4. Existing records

- **Migration:**
  - Fills `hotels.timezone` and `restaurants.timezone` from the current city list, so the Rockies records keep their present timezones.
  - Unknown cities stay empty, rather than becoming Vancouver.
  - Flights, Transportation and Itinerary rows already store a timezone and are not changed.
- **Records left empty** (such as the Seattle hotel) show "Timezone needed" and are looked up the next time they're saved. A **Look up** button in the form does it on demand.
- **Calendar:** a record whose timezone changes is marked `gcal_dirty`, so the next sync corrects its events.

### 5. Removed

- The city list and airport list in `lib/gcal/timezones.ts`, once everything reads stored timezones.
- The Vancouver fallback.
- The 3 copies of the 4-option list.

## Google setup (Stan)

Stan isn't sure the key is set up correctly, so the build includes a check (below).

1. In Google Cloud Console, in the project the key belongs to, **enable Geocoding API and Time Zone API**.
2. **Restrict the key:**
   - API restrictions: only those two APIs.
   - Application restriction: none. The calls come from Vercel's and this Mac's servers, whose addresses change, and the key never reaches a browser.
3. **Set a budget alert**, and optionally daily quotas, in Billing. Helm makes a few lookups per record saved.
4. **Store the key:**
   - Locally: `/usr/local/helm-bin/helm-secrets-set GOOGLE_MAPS_API_KEY`, run from the `developer` account. The installed script refuses any name not on its list, so first `scripts/security/helm-secrets-set` gets `GOOGLE_MAPS_API_KEY` as an optional (settable and removable) name. `helm-dev` exports it if present and doesn't require it. Stan reinstalls the scripts from the admin account with the `sudo install` step in `docs/helm-secrets-encryption-plan.md`.
   - Vercel: an environment variable `GOOGLE_MAPS_API_KEY`, marked Sensitive, for Production.
   - Agents never see it.
5. **Check it:** the DEV panel gets **Test timezone lookup**, which looks up "Ann Arbor, MI", "Kyoto, Japan" and "NRT airport" and shows each result or Google's error message (for example "API not enabled"), never the key.

## Database impact

| Question | Answer |
|---|---|
| New columns | `hotels.timezone`, `hotels.country`, `restaurants.timezone`, `restaurants.country`. All are nullable text. |
| New tables, policies, Realtime | None. |
| New query patterns or indexes | None. The columns are read with the rows already loaded. |
| Write frequency | Unchanged. The timezone is written in the same update as the save. |
| External calls | 2 Google requests per looked-up place, only when its location changes. |

## Separate, not in this plan

- **Old timezone data on the server.** Node v22.22.2 has tz 2025c, which predates BC's change. Server-side conversions for real BC places from November 2026 on are an hour off, while the browser is right. The fix is a Node release with tz 2026b or later, here and on Vercel. It affects only BC and is not needed for the Seattle bug.
- **Address autocomplete** (Google Places) while typing. It is possible later; it costs more and puts a key in the browser.

## Testing

- Typecheck and lint.
- Stan, on Mac, iPad and iPhone:
  1. **DEV panel:** Test timezone lookup.
  2. **Seattle hotel:** press Look up, and check that the Itinerary shows 7:00 AM PST.
  3. **A new Ann Arbor hotel** shows Eastern time. A Kyoto restaurant with Country "Japan" shows JST.
  4. **A flight HND → SEA** gets both timezones and shows correctly in the Itinerary.
  5. **Change…** overrides the timezone and keeps it on later saves.
  6. **Offline:** a save waits, then gets its timezone when it is sent.
  7. **Calendar:** a corrected record's events move to the right time after sync.

## As built (00.04.0022)

**Approved by Stan 2026-11-02 ("Approve, build it").**

**Migration** `supabase/migrations/202611020001_place_timezones.sql`, applied by Stan:
- Adds `timezone` and `country` to hotels and restaurants.
- Fills the timezone of existing rows from the old 7-city list.
- Recreates `copy_trip` so copies keep both new fields.

**Lookup:**
- **Module:** `lib/geo/timezone-lookup.ts` (server). The place text it uses is built by `lib/geo/place-query.ts`, which the forms share.
- **In the forms:** the lookup runs about 1.2 seconds after the place stops changing, through `POST /api/timezone/lookup` (signed-in only).
- **On save, as a fallback:** an empty timezone is looked up by the save routes. This also covers saves made offline, and document imports.
- **Airports:** the lookup waits for a complete 3-letter code. When the city field is empty, the lookup also fills it in.

**Timezone field** (`components/ui/TimezoneField.tsx`), used in Hotels, Restaurants, Transportation, Flights and Itinerary rows:
- Shows a line with the timezone, plus Look up and Change… buttons.
- Change… lists the trip's own timezones first, then every timezone the browser knows, and can be searched.
- Itinerary rows: the end timezone has no lookup and shows "Same as start" when empty.
- The field is remounted for each form opened, so lookup state never carries over between records.

**Removed:**
- The city and airport lists in `lib/gcal/timezones.ts`.
- The three 4-option timezone lists.
- Every America/Vancouver fallback.

**A record without a timezone:**
- Itinerary: shows "Time zone unknown".
- Printing: the time is printed without a time, marked "(time zone unknown)".
- Calendar sync: reports "timezone needed" for that item.

**Secrets:**
- `scripts/security/helm-secrets-set` accepts `GOOGLE_MAPS_API_KEY` as an optional name.
- `helm-dev` already exports every name in the store, so it was not changed.
- Until Stan reinstalls the script, `test-helm-launcher.sh` reports the expected "installed bytes differ".

**Not changed:** the server's old timezone data for BC (see "Separate").

**Checks:** typecheck and lint pass. Not tested in the app: the browser pane isn't signed in, and the key isn't set yet.
