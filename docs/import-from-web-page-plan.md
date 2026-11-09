# Import from a web page

**Status:** proposed 2026-11-08 — Claude Code (Opus 5.5). **Not approved for building.**

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

## Proposed steps (one version, 00.04.0062)

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
- Bump to 00.04.0062, changelog entry, HANDOFF update.

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
- [ ] Stan approves building.
