# Local development database (option C)

**Status:** proposed 2026-11-09. Not approved; nothing is built.
**Author:** 2026-11-09 — Claude Code (Opus 5.5)
**Asked by:** Stan, 2026-11-09 ("Plan option C"), following
`docs/developer-account-security-assessment.md` §4. A second hosted project is
ruled out: the free plan's two projects are used by Orb and Helm, and Pro is
too expensive.

## Goal

Localhost uses a Supabase stack running on the Mac, filled with test data. The
dev server, the agents and the browser pane then hold **no production database
key or session**. Production changes only through a release, plus migrations
that Stan applies at release time.

## Research summary

- **The repo is already set up for a local stack.**
  - The `supabase` CLI is a dependency (`^2.101.0`), so `npx supabase` runs the
    copy in `node_modules`.
  - `supabase/config.toml` exists, with project `helm`, API on 54321, database
    on 54322, Studio on 54323, the mail catcher on 54324, and Postgres 17.
  - There's no `supabase/seed.sql` yet.
- **The schema can't be built from the repo.** The 20 migrations start at
  `202608240001`, but the original tables predate them. A schema-only dump of
  production is needed as a baseline.
- **Supabase features Helm uses:**
  - Database and RLS, plus ten `.rpc()` functions.
  - Email one-time codes (`signInWithOtp`), and passkeys (experimental flag in
    `lib/supabase/server.ts`).
  - No Realtime (no `.channel(` or `postgres_changes`) and no Storage.
- **How clients are created:**
  - `lib/supabase/client.ts` (browser);
  - `lib/supabase/server.ts`, `lib/auth/trip-access.ts` and `proxy.ts`;
  - about 35 route files that create service clients directly.

  All of them read `NEXT_PUBLIC_SUPABASE_URL`.
- **Cookie names come from the URL.** `@supabase/ssr` names the session cookie
  `sb-<first label of the hostname>-auth-token`. The browser and the server must
  use the **same URL**, or they look for different cookies.
- **Next 16.2.5 rewrites** can proxy to an external URL
  (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md`,
  "Rewriting to an external URL").
- **`helm-dev`** exports the decrypted names, then runs `npm run dev`
  (`scripts/security/helm-dev:194–250`). Its six required names are unchanged
  by this plan; only their values change.

## Design

### How every device reaches the local stack

Local Supabase listens on plain `http://127.0.0.1:54321`. The iPad and iPhone
can't reach that address, and an `https` page may not call `http` anyway. So
Supabase traffic goes **through the dev server**, which already has a trusted
certificate:

- `next.config.ts` gets a rewrite, **only when `NODE_ENV` is `development`**:
  `/sb/:path*` → `http://127.0.0.1:54321/:path*`. Production builds don't
  have it.
- `NEXT_PUBLIC_SUPABASE_URL` becomes
  **`https://stanleys-macbook-pro.local:3000/sb`**, one URL for the Mac,
  iPad, iPhone and the server. The cookie is
  `sb-stanleys-macbook-pro-auth-token` everywhere.
  - On the Mac at `https://localhost:3000`, the browser calls the `.local`
    address cross-origin. The local Supabase gateway answers CORS for this.
    Supabase calls use headers, not cookies.
  - `supabase-js` adds `/auth/v1` and `/rest/v1` under the base URL, so a path
    prefix works.
- **The server calls itself** through the same URL. Node must trust the mkcert
  CA, so the `dev` script sets `NODE_EXTRA_CA_CERTS` to a copy of the CA's
  **public certificate**, `rootCA.pem`. Stan copies it from the admin account.
  The CA's private key is never copied, as before.
- No other code changes: all client code keeps reading
  `NEXT_PUBLIC_SUPABASE_URL`.

*Unverified until step 1:* CORS through the rewrite, Node trusting the CA via
`NODE_EXTRA_CA_CERTS`, and `.local` lookup from the server. Step 1 tests all
three before anything is switched.

### Schema

- Add `supabase/migrations/20261109000000_baseline.sql`, Stan's schema-only
  dump of production's `public` schema: tables, RLS, functions, triggers,
  grants, no rows. It's reviewed by Claude before use.
- The 20 existing migrations are already inside the baseline. They move to
  `supabase/migrations-applied/` (kept for history), so `supabase db reset`
  runs the baseline, then any newer migrations, then the seed.
- Anything outside `public` is checked with two queries Stan runs in
  production's SQL editor: triggers on `auth.users`, and installed extensions.
  Anything found is added to the baseline.

### Test data and accounts

- `supabase/seed.sql` (written by Claude) creates:
  - one test trip that touches every section: itinerary days and rows,
    flights, hotels, restaurants, transportation, key info, checklist, packing,
    a Calendar-ready row;
  - two test users, "Stan Test" and "Agent Test", each an advisor on the trip.
- The data is invented. No real names, confirmation numbers or addresses
  beyond public places.
- Sign-in is by one-time code. The local mail catcher
  (`http://127.0.0.1:54324`) shows each code, so no real email is sent. The
  agent can sign in to the browser pane with the Agent Test account itself.
  Its address goes in the seed file; there's no password.
- More realistic data: use Helm's own Import (document or web page) into the
  local trip.

### Migrations from now on

| Where | Who | When |
|---|---|---|
| Local | **Claude** runs `npx supabase migration up`, or `db reset` | while building; no more "Migration applied" round trip |
| Production | **Stan**, in the SQL editor, as today | at release, **before** `helm-release` pushes |

- Migrations stay idempotent and additive-first, so production can take them
  before the new code arrives.
- Each changelog entry names its migrations. HANDOFF records "local / production"
  separately.
- Optional, as a separate approval: `helm-release --check` lists migration files
  added since the last release.

### What stays as it is

- Google Calendar: same OAuth client and redirect. Connecting Google in local
  development writes to Stan's **real** Google Calendar, as today. The tokens
  are now stored locally.
- Anthropic and Google Maps keys are unchanged unless Stan decides otherwise
  (decision 3).
- Production: no code path changes. The rewrite only exists in development.

## Steps

**S** = Stan in `developer`, **S-admin** = Stan in the admin account,
**A** = Claude. Every A step is done only after Stan approves the plan.

1. **Proof of route (nothing switched yet).**
   1. **S-admin** installs Docker Desktop with the settings in decision 1.
   2. **S-admin** copies the CA's public certificate to
      `/Users/developer/Project-secrets/helm-secrets/ca/rootCA.pem`, mode
      `0644`, owned by `developer`.
   3. **A** makes these changes and runs `npx supabase start`:
      - `config.toml`: Realtime, Storage and Studio's AI key off; auth site URL
        and redirect URLs for `https://localhost:3000` and
        `https://stanleys-macbook-pro.local:3000`;
      - `next.config.ts`: the development-only rewrite;
      - `package.json`: `NODE_EXTRA_CA_CERTS` in `dev`.

      `npx supabase start` downloads the Supabase images, a few GB from public
      registries; the first run asks for Stan's OK. Version bump.
   4. **S** restarts `helm-dev`. The app is still on production, unchanged.
   5. **A** checks:
      - `https://stanleys-macbook-pro.local:3000/sb/auth/v1/health` returns JSON
        on the Mac;
      - a server-side fetch of the same URL succeeds;
      - which interfaces ports 54321–54324 listen on. **If any listens on all
        interfaces, stop.** The local keys and database password are
        well-known defaults, and the firewall is off. Bind them to 127.0.0.1
        before going on.
   6. **S** opens the same health URL on the iPhone and iPad.
2. **Baseline schema.**
   1. **S-admin** dumps production's schema with the database password, which
      never enters `developer`. One way is Homebrew `libpq`'s `pg_dump`
      (version 17 or later):
      `pg_dump --schema-only --schema=public --no-owner "<connection string>" > ~/Release/helm-baseline.sql`.
      Stan then copies the file to `/Users/Shared` for Claude, and also runs
      the two `auth.users` trigger and extension queries.
   2. **A** reviews the dump: every table has RLS, each policy uses
      `(SELECT auth.uid())`, all ten functions are present, there are no rows,
      and nothing grants extra rights. A adds it as the baseline, moves the old
      migrations, runs `npx supabase db reset`, and compares the table and
      function lists with the dump.
3. **Seed.** **A** writes `seed.sql`, runs `db reset`, and checks every section
   has rows.
4. **Switch.**
   1. **S**, on the Mac, iPad and iPhone: sign out of Helm on localhost, then
      **clear the site data** for `localhost:3000` and
      `stanleys-macbook-pro.local:3000`. The offline copies and any unsent
      offline edits on those devices hold production trip data and IDs, which
      must not replay into the local database.
   2. **S** runs `helm-secrets-set` three times:
      - `NEXT_PUBLIC_SUPABASE_URL` → `https://stanleys-macbook-pro.local:3000/sb`;
      - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` → the
        local values printed by `npx supabase status`.

      Then **S** clears `.next/dev` (`NEXT_PUBLIC_*` values are compiled in;
      see the Turbopack stale-cache note) and restarts `helm-dev`.
   3. **A** signs in to the browser pane as Agent Test. A then runs one pass
      of every section: read, write and delete, plus Import, Copy Trip, Clear
      Data, the offline save queue and sign-out.
   4. **S** signs in as Stan Test on the Mac, iPad and iPhone and tests the
      same areas.
5. **Rotate the production secret key.**
   - **S** checks the key type in the Supabase dashboard (API Keys) first. With
     the newer `sb_secret_…` keys, Stan creates a new key, updates Vercel,
     redeploys, then deletes the old one.
   - With the legacy `service_role` JWT, rotating means rotating the JWT
     secret, which also signs every user out. Plan that separately.
   - Optional at the same time: rotate the Google OAuth secret and the
     Anthropic key (decision 3).
6. **Documents.** **A** updates:
   - `AGENTS.md`: Environments, migrations, test accounts, "agents never hold
     production keys";
   - HANDOFF;
   - the assessment;
   - the changelog.

   Knowledge entries go through `orb-agent propose`.

**Rollback** (any time before step 5): **S** sets the three values back to
production's with `helm-secrets-set`, clears `.next/dev`, then restarts. The
rewrite and config changes do no harm when unused. After step 5, roll back with
the new key, never the old one.

## DB impact

- Production: none. There are no new tables, queries, Realtime use or write
  patterns, and test traffic leaves production, so it gets lighter.
- Local: Postgres 17 in a container, about 2 GB of memory while running. Stan
  stops it with `npx supabase stop` or by quitting the runtime.
- The RLS initplan check runs during the baseline review (step 2.2).

## Risks

| Risk | Mitigation |
|---|---|
| Forgetting a production migration at release | Apply before pushing; changelog names migrations; optional `helm-release --check` listing |
| Local schema drifts from production | Rebuilt from the repo each `db reset`; occasional schema compare from a fresh dump |
| Local services reachable from the network with default keys | Step 1.5 checks the ports listen on 127.0.0.1 only |
| Device offline copies replaying production IDs into the local database | Step 4.1 clears site data first |
| Passkeys don't work against the local Auth version | One-time codes work; passkeys stay tested on production |
| The route doesn't work on devices | Found in step 1 before anything is switched; fall back to Mac-only local testing, or reconsider |

## Decisions for Stan

1. **Container runtime: Docker Desktop** (decided by Stan 2026-11-09; he knows
   it). Set it up as follows:
   - Install it from the admin account; no Docker sign-in in `developer`.
   - Settings → Resources: memory limit about 4 GB, Resource Saver on.
   - "Start Docker Desktop when you sign in": off.

   Check the personal-use licence terms at install time.
2. **Local migrations: Claude applies them** (Stan, 2026-11-09).
3. **Other keys: keep the shared Anthropic, Maps and Google OAuth keys for
   now** (Stan, 2026-11-09).
4. **Approved to build** (Stan, 2026-11-09). Step 1 stops for Stan's device
   check before anything else.

## Progress

- 2026-11-09, step 1.3 (A), version 00.04.0070:
  - `supabase/config.toml`: Realtime, Storage, Edge Functions and Analytics
    off; Studio's AI key line removed; Auth site and redirect URLs set to
    `https://localhost:3000` and the Bonjour URL.
  - `next.config.ts`: `/sb/:path*` → `http://127.0.0.1:54321/:path*` in
    development only.
  - `package.json` `dev`: `NODE_EXTRA_CA_CERTS`.
  - The 20 old migrations moved to `supabase/migrations-applied/`, from step
    2. Moved early so the first `supabase start` doesn't fail running
    migrations against an empty database.

  Not started: no Docker yet; `npx supabase start` waits for steps 1.1–1.2
  and Stan's OK for the image download. The service worker passes `/sb`
  requests straight to the network: only `/_next/static/` is cached, plus
  navigations.
- 2026-11-09, steps 1.1–1.2 done by Stan. Docker Desktop runs in `developer`
  only (4 GB), after the admin account's copy was quit. Stan restarted
  `helm-dev`, which is on 0070, and `/sb` answers 500 with nothing behind it.
- 2026-11-09, Supabase CLI 2.101.0 wouldn't run: macOS killed it for an
  invalid signature.
  - A fresh npm copy matched the lockfile integrity hash and was
    byte-identical to ours, so it's Supabase's packaging, not tampering.
  - Re-signed ad-hoc with `codesign --force --sign -` (Stan approved). **A
    reinstall (`npm ci`) brings the broken signature back; re-sign again.**
- 2026-11-09, first `supabase start` succeeded, but the API, database, Studio
  and mail catcher listened on `0.0.0.0`. The CLI's own notice says so, and
  Studio and pgMeta have no authentication. **Stopped at once**, per step 1.5,
  and the database was empty. Fix to test: bind Docker's published ports to
  127.0.0.1 (Docker Engine `"ip": "127.0.0.1"`); fallback: the macOS firewall.
- 2026-11-09, Stan set Docker Engine `"ip": "127.0.0.1"`. **It doesn't work
  on Docker Desktop.**
  - The stack still bound `0.0.0.0` and was stopped again.
  - A plain `docker run -p 54399:8025` also bound `0.0.0.0`; an explicit
    `-p 127.0.0.1:54399:8025` bound 127.0.0.1 correctly.
  - So the engine default is ignored, and the Supabase CLI (2.101.0) has no
    bind-address option.

  Next: the macOS firewall blocking incoming connections to Docker (Stan),
  verified from the iPhone.
- 2026-11-09, firewall on, set by Stan and checked by Claude: Docker.app
  "Block incoming", node "Allow", block-all off. The stack was started again.
  - `/sb/auth/v1/health` returns 200 (GoTrue v2.188.1) on the Mac at both
    `localhost:3000` and the Bonjour name.
  - Node's `fetch` of the Bonjour `/sb` URL returns 200 **with and without**
    `NODE_EXTRA_CA_CERTS`. Node 26 already trusts the mkcert CA from the
    macOS keychain, so the variable is belt-and-braces, not needed.
  - Stan's device check passed: the health URL showed GoTrue's JSON, and
    `http://stanleys-macbook-pro.local:54324` failed ("the network connection
    was lost"), so Docker is blocked from the network. **Step 1 is done.**
- 2026-11-09, step 2. Stan exported production's `public` schema (171 KB) to
  `/Users/Shared/helm-baseline.sql` and ran the three queries:
  - no triggers on `auth.users`;
  - extensions `pg_stat_statements`, `pgcrypto`, `uuid-ossp`,
    `supabase_vault`, `plpgsql`, all present in the local image;
  - PostgreSQL 17.6.

  Review (Claude):
  - no rows, no keys, URLs or vault use;
  - RLS on all 35 tables;
  - all 11 `SECURITY DEFINER` functions set `search_path`.

  Added as `supabase/migrations/20261109000000_baseline.sql`, minus five kinds
  of hosted-only lines, listed in its header. `npx supabase db reset` applied
  it. Local matches the dump: 35 tables (same names), 35 with RLS, 34 policies,
  13 functions (all ten `.rpc()` functions), 15 triggers, 0 rows. **Step 2 is
  done.**

  **Production finding (follow-up, not part of this plan):** all 34 policies
  use bare `auth.uid()`, none wrapped in `(SELECT auth.uid())`, which goes
  against AGENTS.md's RLS initplan rule. Tables: checklist, error_log,
  key_info_groups, nearby_dining, packing, packing_groups, packing_subgroups,
  trip_members, trips, users. The cost is performance (per-row evaluation),
  not security. Fix with a migration, tested locally first, then applied to
  production.

  Not in the dump: production's event trigger calling `rls_auto_enable()`,
  which doesn't matter locally.
- 2026-11-09, step 3. `supabase/seed.sql` holds:
  - two accounts, Stan Test (`stan.test@helm.test`) and Agent Test
    (`agent.test@helm.test`), in `auth.users`, `auth.identities` and
    `public.users`;
  - "Test Trip — Rockies" (`33333333-…`) with both as advisors, and rows in
    every section.

  The baseline now ends by restoring `search_path`: pg_dump clears it, and the
  checklist trigger's unqualified `checklist` failed in the seed. `db reset`
  is clean.

  Checked through `/sb` on the Bonjour URL:
  - a code request returns 200 and the code arrives in the mail catcher;
  - verifying it signs in;
  - REST works.

  Production's `trips_select_own` RLS policy shows a trip only to its creator
  (`created_by`), not to other members. The app reads trips with the service
  key and checks `trip_members` itself, so this doesn't affect it. Production
  behaves the same. **Step 3 is done.**

- **2026-11-10, step 4.** Stan set the three values and restarted `helm-dev`.
  The server had the new URL, but every request it made to its own `/sb`
  route failed before reaching the local stack (`/api/health` returned 503,
  so pages showed "This page needs a connection"; `check-email` said no
  account). Cause: `stanleys-macbook-pro.local` resolves to `::1` first, the
  server listened on IPv4 only (`-H 0.0.0.0`), and Next's server fetch doesn't
  fall back to IPv4 (plain Node does; `node --no-network-family-autoselection`
  reproduces the failure). Fix with Stan's approval (00.04.0071): `-H ::` in
  the `dev` script, which listens on IPv6 and IPv4.

- **2026-11-10, step 4 (continued).** After the restart the server still
  failed. A temporary diagnostic in `/api/health` (removed) showed the real
  error: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Next's `next dev` starts its
  server worker with `NODE_EXTRA_CA_CERTS` set from `--experimental-https-ca`
  (`node_modules/next/dist/cli/next-dev.js`), replacing ours with nothing, so
  the server never trusted the mkcert CA. My earlier "Node 26 trusts the
  keychain" result came from `NODE_USE_SYSTEM_CA=1` in my own shell, not from
  Node. Fix (00.04.0072): pass the CA with `--experimental-https-ca` and drop
  `NODE_EXTRA_CA_CERTS`. The IPv6 change (`-H ::`) may not have been needed,
  since the IPv4 fallback probably works in the server too; it is kept, as it
  does no harm.

- **2026-11-10, step 4.3 (Claude's pass, browser pane, Bonjour URL).** After
  00.04.0072 and a restart, `/api/health` is ok and the server reaches the
  local stack. Results:
  - Sign-in by code (from the mail catcher) works for both test accounts;
    sign-out works.
  - Agent Test's dashboard is **empty**: it reads trips with the user's own
    session, and `trips_select_own` shows a trip only to its creator. Agent
    Test is an advisor member but not the creator. This corrects step 3's note
    ("the app isn't affected"): the dashboard is affected, in production too,
    for any advisor who didn't create the trip. Today only Stan uses Helm and
    he created every trip, so nothing visible is wrong. Fix belongs with the
    RLS follow-up.
  - As Stan Test: dashboard shows only Test Trip — Rockies; Overview loads.
  - Flights, hotels, restaurants, transportation, checklist, Key Info,
    packing, itinerary rows: list, create, update and delete all succeed
    through the app's own routes; the database shows each update and a soft
    delete (`deleted_at`).
  - Copy Trip copied every section; Clear Data (calendar skipped) emptied the
    copy ("Copy of Test Trip", left in place).
  - Import (one Anthropic call on the shared key) read a test restaurant
    booking and confirm saved it at the right time (19:30 Banff = 01:30 UTC).
  - Offline queue: with DEV "Simulate Offline" on, ticking a checklist item
    queued one PATCH and left the database unchanged; turning it off sent it
    and the item is completed.
  - No new `helm_logs` rows.
  Not covered: Google Calendar (not connected locally), passkeys, the iPad and
  iPhone (Stan's pass, as Stan Test).

- **2026-11-11, step 4 (Stan's pass).** Signed in as Stan Test on the Mac,
  iPad and iPhone: each shows only the test trips, and edits survive a
  reload. Earlier the same day Docker Desktop wasn't running, and the sign-in
  page offered to create an account: `/api/health` counts the `/sb` route's
  error reply as online, and `check-email` reports any database error as "no
  account" (follow-up). **Step 4 is done.**

- **2026-11-11, step 5 (Stan).** Production used an `sb_secret_` key. Stan
  created `vercel_2026_11_11`, set it as Vercel's `SUPABASE_SECRET_KEY`,
  redeployed, checked an edit saves on production, then deleted the old
  `default` secret key. The production key once held in the development
  secrets store no longer works. **Step 5 is done.**
