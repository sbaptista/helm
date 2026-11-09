# Import from a web page

**Status:** approved by Stan 2026-11-08 ("Build it"); built as 00.04.0066, not tested by Stan.

Stan's request: "Add URLs to Import", meaning: import a trip from a web page
(paste its link) as well as from a file.

## Research summary

- Import today: `components/advisor/TripDetailView.tsx` (Import Trip Document
  modal, file picker `accept=".pdf,.docx,.txt,.md,.json"`) posts `file` to
  `POST /api/trips/import` (`app/api/trips/import/route.ts`), which extracts
  text (`extractText`: pdf-parse, mammoth, UTF-8), checks `MAX_INPUT_CHARS`
  (200,000), streams Claude's JSON back, and the review page / confirm route
  take it from there. Nothing after text extraction cares where the text came
  from.
- The file name is shown only in the modal; `import_jobs` doesn't store a
  source, so a web page needs no schema change.
- No HTML-parsing library is installed. The only server-side fetch of
  user-supplied links today is `expandShortLink` in `lib/geo/map-location.ts`,
  limited to Google's short-link hosts.
- Fetching a link the user types is a server-side request forgery risk: the
  server could be pointed at `localhost`, the local network or a cloud
  metadata address. The fetch must refuse those, including after redirects
  and DNS tricks.

## Proposed steps (one version, 00.04.0066)

### 1. Import modal: File or Web page
- A two-option switch at the top of the modal: **File** (today's picker,
  unchanged) | **Web page**. 44pt tall, works by tap.
- Web page: a URL field, label **Web page address**, placeholder
  `https://example.com/your-itinerary`, `inputMode="url"`, no autocorrect or
  autocapitalise. Checked on blur with `isWellFormedUrl` (`lib/links.ts`);
  red border only after the field is touched. Import is disabled until it is
  well-formed.
- A short note under the field: "Works with pages that open without signing
  in. For a page behind a login, save it as PDF and import the file."
- Same progress phases; the first phase reads "Opening the page…" instead of
  "Reading the file…". The progress bar uses the length of the text the
  server returns (the byte count isn't known in advance), so it may start
  without a total.

### 2. Route: accept `url` instead of `file`
- `POST /api/trips/import` takes either `file` or `url` (not both). Same
  advisor check, DEV error simulation, `MAX_INPUT_CHARS` and AI path.
- The user message to Claude says the text came from a web page and names it
  (`Parse this travel document (web page: <url>)`). The system prompt is
  unchanged apart from one line: ignore site navigation, menus, cookie
  notices and footers.

### 3. `lib/import/fetch-page.ts` (new, server only)
- Allowed: `http:` and `https:` only; ports 80/443 only; no user name or
  password in the link.
- Safe address check: the hostname is resolved and **every** address must be
  public. Refused: loopback, private (10/8, 172.16/12, 192.168/16), link-local
  (169.254/16, incl. metadata), CGNAT (100.64/10), 0/8, multicast, reserved,
  and the IPv6 equivalents (::1, fc00::/7, fe80::/10, IPv4-mapped forms).
- The check happens **at connect time**: the request is made with
  `node:https` / `node:http` and a custom `lookup` that refuses unsafe
  addresses, so a host can't pass the check and then resolve somewhere else
  (DNS rebinding). No new dependency.
- Redirects followed by hand, at most 5, each re-checked the same way.
- Limits: 15-second timeout, 5 MB body (stops reading past it), a plain
  browser-like `Accept` header and a `User-Agent` naming Helm (no personal
  data, no cookies).
- Content types: `text/html` → text (step 4); `text/plain` → as is;
  `application/pdf` → the existing PDF extraction (a link straight to a PDF
  works too). Anything else is refused.

### 4. HTML to text (in the same file, no library)
- Drop `script`, `style`, `noscript`, `svg`, `template`, `iframe`, `head`,
  comments.
- Block elements (`p`, `div`, `br`, `li`, `tr`, headings, `section`…) become
  line breaks; table cells become ` | `; list items get `- `.
- Links keep their address: `text (https://…)`, so booking and website links
  reach Claude.
- Decode HTML entities (named common ones and numeric), collapse blank runs.
- If what's left is under ~200 characters: "No readable trip details found on
  this page. If it needs you to sign in, or only shows its content in a
  browser, save it as PDF and import the file."

### 5. Errors (plain messages, same style as file errors)
| Case | Message | Status |
|---|---|---|
| Not a well-formed http/https link | Enter a full web address starting with https:// | 400 |
| Private or local address | Helm can't open this address. | 400 |
| Can't reach / timeout / DNS failure | Helm couldn't open this page. Check the address and try again. | 422 |
| HTTP 401/403 | This page needs you to sign in. Save it as PDF and import the file. | 422 |
| Other HTTP error (404, 500…) | The page returned an error (HTTP n). | 422 |
| Too large | This page is too large to import. | 422 |
| Unsupported type | Helm can't import this kind of page. | 422 |

Unexpected failures go to `helm_logs` via `logger.error` with the host only
(not the full link, which may carry tokens). Expected refusals are not
logged (Logs policy).

### 6. Release
- Bump to 00.04.0066, changelog entry, HANDOFF update.

## DB impact
None: no table, column, index, policy, Realtime or new query pattern.
`import_jobs` is written exactly as today.

## Security notes
- Only trip advisors can call the route (unchanged `requireTripMember`).
- On Vercel the server-side fetch runs from Vercel's network; the address
  check still applies so a link can't reach internal or metadata addresses.
- The page's text is data for Claude, never instructions; the review page
  still shows everything before anything is saved.

## Verification
- Typecheck and lint.
- Claude: unit-style checks of the address filter (localhost, 127.0.0.1,
  10.x, 169.254.169.254, `[::1]`, IPv4-mapped IPv6, a redirect to a private
  address) and the HTML-to-text on a saved itinerary page.
- Stan, on localhost (Mac) and the Bonjour URL (iPad, iPhone): import a
  public itinerary page; a direct PDF link; a page behind a login (gets the
  sign-in message); a 404; paste a link from the Safari share sheet.
- Production check after release (Vercel's network).

## Approval
- [x] Stan approved building 2026-11-08.

## Progress
- 00.04.0066 built 2026-11-08: `lib/import/fetch-page.ts` (address checks, connect-time DNS check, redirects, limits, HTML to text), `app/api/trips/import/route.ts` (`url` or `file`; `X-Import-Input-Chars` header for the progress bar; a "Source: web page <url>" line before the page text), Import window File | Web page in `components/advisor/TripDetailView.tsx`. A page with under 200 characters of text gets the "No readable trip details" message (`no_text`).
- Checked by Claude 2026-11-08 (Node, against the module): 23 private/reserved addresses refused and 6 public ones accepted, including IPv4-mapped, NAT64 and 6to4 forms; 13 bad or private links refused before fetching (localhost, 127.0.0.1, [::1], 169.254.169.254, 10.x, .local, port 8443, ftp, file, user:password, no dot); HTML to text drops scripts/styles/comments, keeps link addresses, decodes entities, lists and table cells; live: a Wikipedia page reads (48,525 characters), example.com gets `no_text`, a 404 gets `http_error`, a host resolving to 127.0.0.1 (localtest.me) is blocked, a direct PDF link returns PDF bytes, redirects (postman-echo) to 127.0.0.1, 169.254.169.254, [::1], localtest.me and 10.0.0.1 are blocked, a redirect to a public page is followed, six redirects in a row are refused. httpbin.org and httpbingo.org answer 403 to automated requests, so they can't be used for this test.
- Checked by Claude in the browser pane 2026-11-08 (Test Delete trip, signed in by Stan): File | Web page switch (File keeps the drop zone); Web page shows the address field, placeholder and note, no Import button until the address is valid; "example.com/trip" gets the red border and "Enter a full web address starting with https://" after leaving the field; Enter starts the import; http://127.0.0.1/ → "Helm can't open this address."; a Wikipedia 404 → "The page returned an error (HTTP 404)."; https://example.com/ → the "No readable trip details…" message; Try Again returns to the field with the address kept. None of these reached Claude. Window closed with Cancel.
- Not yet checked: a full import through Claude, iPad/iPhone, production (Vercel's network).

## Addendum: Website links (approved by Stan 2026-11-08, built as 00.04.0067)

Stan: when Import creates a restaurant from a web page, that page is often the
restaurant's own website, so it should become the Website link, not show up
elsewhere. Found on Test Delete: "Mia's Italian Kitchen" (imported from
miasitalian.com) has no Website and the page address in Notes; "Josephine"
has no Website. Map links are fine (automatic, from the address).

Cause: Import has no website field at all. The parser isn't asked for one,
`prepareInsert` and `import_trip_document` don't save `website_url`, and the
review page doesn't show it, so Claude put the address in Notes.

Proposed (one version, 00.04.0067):
1. Parser: hotels, restaurants and transportation get `website_url`, the
   place's own website when the document shows one, never invented. Web
   addresses that are a record's website go there, not in notes.
2. Web page imports: after parsing, each hotel, restaurant and transfer
   without a website gets the imported page's address (marked as coming from
   the page). File imports are unchanged.
3. Review page: a Website field on hotels, restaurants and transfers, so it
   can be checked or changed before saving.
4. Save: `prepareInsert` keeps `website_url` when it's a well-formed link;
   migration replaces `import_trip_document` so its hotel, restaurant and
   transportation inserts and updates include `website_url` (nothing else
   changes in it).
5. Re-import updates: Website joins the compared fields, but an address that
   only came from the page never replaces a website a record already has.
6. Map links stay automatic from the address; Booking links unchanged.

DB impact: the function is replaced; no new table, column, index or policy.

Built (00.04.0067): `website_url` in the parser's hotels, transportation and
restaurants (never invented, not in notes); after parsing, a web page import
fills missing ones with the typed address and marks them `__website_from_page`
(`WEBSITE_FROM_PAGE`, `WEBSITE_SECTIONS` in `lib/import/match-types.ts`);
`prepareInsert` keeps well-formed links only; Website joins the re-import
fields, and `proposedWebsite` drops a page-only address when the booking has
a website; migration `202611080002_import_website_links.sql` (not applied)
recreates `import_trip_document` with `website_url` in the three inserts and
updates. Review page: website listed as "website" or "website (this page)",
editable through a flag like other fields; Helm's `__` markers are no longer
listed. Until the migration is applied, imports still work but don't save
Website.
Checked by Claude in the browser pane 2026-11-08: a sample preview (put in
session storage, never confirmed) shows a hotel's own Website as "Website" and
a page-filled one as "Website (This Page)"; no `__` markers listed. Not yet
checked: a real web page import through Claude with the migration applied.

## Addendum 2: review page width, re-import of undated places, map on import (approved by Stan 2026-11-08, built as 00.04.0068 except item 4)

Stan's test of 0067 on the Mac (re-importing Mia's Italian Kitchen):
1. Zoomed in, the review page scrolled sideways and Confirm Import sat off
   the right edge. Reproduced at 420px: the page header line ("Test Delete /
   Helm") measures 477px, and the Confirm button can't wrap its label
   (`whiteSpace: nowrap`, `minWidth: 200px`) and ends at 461px.
2. Confirming added a second Mia's: restaurants match only by confirmation
   number, or name + reservation date (hotels: name + check-in). A
   restaurant's website has neither.
3. A new restaurant shows no map picture until it is opened and saved:
   imports never set `maps_url`, `map_lat`, `map_lng` (the form's save runs
   `applyMapLink`; the import doesn't). Known gap since 0059.
4. Every import since 0032 logs "Import saved but its import_jobs record
   could not be written": `import_jobs_status_check` refuses `'completed'`.
   The table was made outside the migrations, so the allowed values need
   Stan's query: `select pg_get_constraintdef(oid) from pg_constraint where
   conname = 'import_jobs_status_check';`

Proposed (one version, 00.04.0068):
1. Review page fits any width or zoom: the header's trip name shortens with
   "…", the Confirm button's label wraps and the bar wraps if needed; no
   sideways scrolling down to 320px.
2. Re-import: an imported restaurant or hotel with no date and no
   confirmation number matches one already on the trip with the same name
   (case and punctuation ignored) or the same website, so you get the update
   screen, not a duplicate. Stan (2026-11-08): he also lists restaurants
   that aren't booked, as possibilities, so undated records are normal and
   must not pile up as duplicates.
   - Website match: compared without "www.", letter case, a trailing "/",
     the query (?…) and the #part. It counts only when the address belongs to
     one place: if two or more imported or existing records share it (a
     "best restaurants" page fills every one with the same page address), it
     is ignored and only names match.
   - Dated or confirmed bookings keep today's rules, so two dinners at the
     same restaurant on different nights stay separate. An undated import
     that matches a dated booking still shows the update screen, where "Add
     as new" keeps them apart.
3. Map on import: new hotels and restaurants get the automatic map link and
   map location when saved, exactly as the form's save does (`applyMapLink`);
   an accepted address change on re-import refreshes them. Migration
   recreates `import_trip_document` with `maps_url`, `map_lat`, `map_lng` in
   the hotel and restaurant inserts and updates (nothing else changes).
4. import_jobs: write a status the constraint allows (once Stan's query
   shows the values), in the same migration.

DB impact: the function is replaced again; no new table, column, index or
policy. Geocoding calls per imported hotel/restaurant (as a form save).

Built (00.04.0068): review header trip name ellipsis and confirm bar wraps
(button `whiteSpace: normal`, `minWidth: min(200px, 100%)`); `siteKey`,
`sharedSites`, `undatedMatch` in `lib/import/bookings.ts` (findCandidates
takes the shared-site set; hotels with no check-in and restaurants with no
date, both with no confirmation number); `withMapLink` in the confirm route
runs `applyMapLink` on inserted and updated hotels/restaurants (a failed
lookup is logged and leaves the location empty); migration
`202611080003_import_map_links.sql` (not applied). Item 4 (import_jobs
status) waits for Stan's constraint query.
Width fix, found while checking: the fixed header's trip name had no
minimum, so a long name made the header wider than the window; it now clips
(`overflow: hidden`, ellipsis), and the page body breaks long web addresses
(`overflowWrap: anywhere` on the main column). Checked by Claude in the pane
(desktop mode, CSS zoom on the page standing in for browser zoom): no
sideways scrolling at 150%, 200%, 250% and 300%; at 200% the header shortens
the trip name and Confirm stays in view. Matching checked through the
read-only matches route on Test Delete: an undated "MIA'S Italian Kitchen"
finds both Mia's records; a different name with the website
https://alexandria-va.miasitalian.com/ written as "HTTPS://WWW.Alexandria-VA
.miasitalian.com?utm=1#top" finds Mia's; two imported places sharing one
website match nothing; a dated Mia's doesn't match the undated ones.
