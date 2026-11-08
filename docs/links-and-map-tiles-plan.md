# Clickable links, automatic map links and map tiles

Accepted by Stan 2026-11-07 ("Build as revised"). Three versions, each tested before the next.

## 1. Clickable URLs
- Well-formed = `http`/`https` with a host containing a dot (`lib/links.ts`, `isWellFormedUrl`). Anything else stays text.
- Cards: Hotels show Website and Map links, Transportation shows Website; Restaurants' links grow to normal size. Links are 44pt tall, open in a new tab, and never also open the edit form.
- Edit forms: every URL field gets a 44pt **Open ↗** beside it when the URL is well-formed (`components/ui/UrlField.tsx`).
- Free text shown on cards (Flight and Restaurant notes, Key Info values, Itinerary descriptions) turns URLs into links (`components/ui/LinkifiedText.tsx`).
- Rows that were `<button>`s and now hold links (Restaurants, Transportation, Itinerary rows) become `div role="button"` with Enter/Space, because a link can't sit inside a button.

## 2. Automatic map link (Hotels, Restaurants)
- `maps_url_auto boolean not null default true`; the migration sets it false where `maps_url` already exists.
- On: Maps URL is generated, read-only: `https://www.google.com/maps/search/?api=1&query=<name, address, city, province, postal code, country>`. Needs street address and city; otherwise "Add a street address and city to create the map link." Off: field is editable.

## 3. Map tiles
- `map_lat`, `map_lng` on `hotels` and `restaurants`, set on save.
- Auto on: Geocoding of the street address; kept only for `ROOFTOP` or `RANGE_INTERPOLATED`, or `GEOMETRIC_CENTER` when the result is a building or business (`street_address`, `premise`, `subpremise`, `establishment`, `point_of_interest`, `lodging`; added 0061 after a hotel came back as a premise), and never a `partial_match`.
- Auto off: coordinates from the user's link (`!3d…!4d…`, or `q=lat,lng`; `maps.app.goo.gl` followed server-side). Viewport centre (`@lat,lng` alone) doesn't count.
- Image: Maps Static API through a Helm route (key stays on the server), cached; tap opens the map link.
- Stan: apply the migration; enable Maps Static API on the existing key.

DB impact: three columns per table, written on save only; no index, policy, Realtime or table.

## Progress
- v00.04.0057–0058: version 1 built; Stan tested 2026-11-07 (0058 added `.text-link`, notes on Hotel/Transportation cards, links listed under notes boxes).
- v00.04.0059: version 2 built, **tested by Stan 2026-11-07: all five checks pass** (migration `202611070001_map_links.sql`, also adds `map_lat`/`map_lng`). Copies and imports take the column default (switch on), so a copied record with a hand-entered link gets the generated one on its next save if it has an address.
- v00.04.0060: version 3 built (not tested). `lib/geo/map-location.ts` (`geocodeExact`: precise Geocoding only; `pinFromUrl`/`pinFromLink`: `!3d!4d`, `q`/`query`/`daddr`/`destination` coordinates, `/maps/place|search/lat,lng`, Apple `ll` with `q`; short links expanded by reading redirects from `maps.app.goo.gl`/`goo.gl/maps` only). `applyMapLink` sets `map_lat`/`map_lng` (never from a request) when the link changes or no location is stored. `GET /api/map-tile/{hotels|restaurants}/{id}?v=lat,lng` (record member only; Static Maps 320×160 @2x, zoom 16, red pin; browser cache `private`, Google's max-age capped at 7 days). `components/ui/MapTile.tsx` on Hotel and Restaurant cards (hidden offline or if the image fails). DEV panel **Fill map locations** (`POST /api/dev/fill-map-locations`, development only, the user's trips, 200 per table per run; shared database, so production records too).
- v00.04.0060 tested by Stan 2026-11-08: address change moves the pin, city-only or made-up street gets no picture, own link (switch off) places the pin, offline hides the picture. Failed: Hampton Inn & Suites Alexandria Old Town Area South (switch on) got no picture.
- v00.04.0061: cause — Google returned the full address, not a partial match, as `GEOMETRIC_CENTER` (a building), which 0060 rejected; building and business results now count. Fill map locations reports reasons per record and writes the automatic link for switch-on records saved before version 2 (one copy of the same hotel had none). The copy with an Apple Maps share link (`maps.apple/r/…`) is walking directions to an address, with no pin, so it gets no picture by design. Checked by Claude in the browser pane: Fill located 3 more, and the Test Delete copy's tile shows the pin on the hotel.
- v00.04.0061 tested by Stan 2026-11-08 (Hampton Inn, a Restaurant, iPhone, iPad). Feature complete.
