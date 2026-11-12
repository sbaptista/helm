# Developer account and development database: security assessment

**Date:** 2026-11-09
**Author:** 2026-11-09 — Claude Code (Opus 5.5)
**Asked by:** Stan, 2026-11-08: "an examination of how effective creating a
developer MacBook account is for security. We can include the separate dev
database there." This followed his question about the browser pane: "is there
a concern about security since I log in?"
**Status:** assessment only. Nothing here is approved or built.
**Update 2026-11-11 — Claude Code (Opus 5.5):** gap 1 and §5 items 2, 4 and 5
are done. Localhost now uses its own Supabase on the Mac
(`docs/local-dev-database-plan.md`); the dev server holds only local keys, and
the browser pane signs in to local test accounts. Stan replaced production's
`sb_secret_` key on 2026-11-11 and deleted the old one, so the copy that was in
the development store no longer works. The macOS firewall is on (Docker.app
incoming blocked), which covers part of gap 7; outgoing monitoring is still
open. Still open: gaps 3 (bypass gating), 5 (Codex `trusted`), 6 (managed
Claude settings), 7 (outgoing monitor), 8 (Downloads), and the Anthropic,
Maps and Google sign-in keys, which stay shared with production (decision 3).
New, found while testing: production's RLS policies use bare `auth.uid()`, and
`trips_select_own` hides a trip from advisors who didn't create it.
**Builds on:** `docs/ai-safeguards-assessment-2026-10-26.md` (threat model
and ranked list; not repeated here) and Orb
`docs/orb-non-admin-development-account-plan.md` (the account plan).

**What was checked (2026-11-09).** These were read-only commands run as
`developer`. No secret values, file contents or Stan's admin home were read.
Items marked *unverified* weren't checked.

---

## Short answer

**The developer account works as designed.** It's a real wall around Stan's
admin account, his personal data, the operating system and GitHub publishing.
All of these were re-checked today and held.

**It doesn't protect Helm's production data, and that's the main remaining
gap.** Localhost and production use one Supabase database. While the dev
server runs, it holds the production service-role key, which ignores
row-level security, and that server runs code an agent can edit.

When Stan signs in through the browser pane, the session is for his **real
production account**, and the agent can read it. That's because the same
database serves both.

A separate development database closes both problems at once. It's the one
change that would make the account boundary cover Helm's data too.

---

## 1. What the account protects, checked today

| Protection | Check (2026-11-09) | Result |
|---|---|---|
| Not an administrator | `dsmemberutil checkmembership -U developer -G admin` | not a member ✅ |
| No elevation | `sudo -n true` | "a password is required" ✅ |
| Stan's home is closed | `ls` of `/Users/stanleybaptista`, `…/Projects`, `…/.claude`, `…/Project-secrets` | Permission denied on all four ✅ |
| Own home is closed to others | `/Users/developer` mode | `drwx------` ✅ |
| Secrets are folder-protected | `Project-secrets`, `helm-secrets`, `tls`, `orb-secrets`, `orb-agent` | all `0700`, store `0600` ✅ |
| No plaintext env file | repo root | no `.env*`, no `.pem` ✅ |
| Launchers are root-owned | `/usr/local/helm-bin`, `/usr/local/orb-bin` | `root:wheel 0755` ✅ |
| AI tool state is private | `~/.claude`, `~/.codex` | `0700` ✅ |
| Can't publish | GitHub token read-only (403 verified 2026-10-16); `review` remote is the local bare repo; `helm-release` runs only in the admin account | holds (push not re-tested today) |
| No SSH keys | `~/.ssh` | doesn't exist ✅ |
| No iCloud | `MobileMeAccounts` | no account ✅ |
| One keychain | `security list-keychains` | `developer` login keychain only ✅ |
| Browser data shielded from agent commands | reading Chrome's `Local State` from this session's shell | "Operation not permitted" ✅ (this tool's sandbox, not the account) |

**Verdict:** for its purpose, keeping AI tools away from Stan's admin account,
his personal data and the publish path, the account is effective. The checks
match the plan's acceptance matrix (Orb plan §13).

## 2. Gaps found today

Ordered by impact.

1. **One database for development and production (largest).** The account
   boundary stops at the edge of the Mac, but the dev server reaches
   production Helm data. There are three ways in:
   - **The dev server's key.** While `helm-dev` runs, the service-role key is
     in a process that runs agent-editable code. 56 code references read
     `SUPABASE_SECRET_KEY`, so the key is everywhere by design. An edited or
     added route could read, change or delete any production row, or send the
     key elsewhere.
   - **Migrations.** "Migration applied" changes production immediately. A
     broken migration is a production outage before any release.
   - **Testing.** Every test write lands in production: the test trips
     created and deleted on 2026-11-08 were production rows.
2. **The browser-pane sign-in (Stan's question).** See §3.
3. **The auth bypass is still ungated.** `proxy.ts` returns on its first line,
   so login is disabled in every environment. `BYPASS_AUTH_USER_ID` is
   honoured wherever it's set: 78 references, and `getDataClient()` switches
   to the service-role key. Pages and trip routes check sessions themselves
   (`lib/auth/trip-access.ts`), so this is safe **only while the variable is
   unset in Vercel**. **Stan confirmed 2026-11-09 that it isn't set in Vercel
   for Orb or Helm**, so production is safe today. Gating it in code remains
   hygiene against a future mistake, a low priority.
4. **Old keys were never rotated.** Accepted risk since 2026-10-23. Rotating
   now does little, because the dev store would hold the new production key
   too. Rotation only becomes worthwhile once development has its own
   database (§4).
5. **Codex trusts the Helm folder.** `~/.codex/config.toml` has
   `trust_level = "trusted"` for `/Users/developer/Projects/helm`. The account
   plan (§10) said "no `trusted` entries". *Unverified* exactly what that
   setting relaxes in the installed Codex version. Check before changing it.
6. **No managed Claude policy.** `/Library/Application Support/ClaudeCode/`
   doesn't exist (Orb plan §10, still to do). The deny rules in
   `.claude/settings.json` are in an AI-editable file. They're guardrails,
   not walls.
7. **The firewall is off, and there's no outgoing-connection monitor.**
   `socketfilterfw` reports "disabled", and there's no LuLu or Little Snitch.
   The macOS firewall only covers incoming connections, so turning it on
   wouldn't stop data leaving. An outgoing monitor would.
8. **Real travel documents sit in `~/Downloads`.** Two booking confirmations
   (hotel and airline, with confirmation numbers), a photo and a trip backup
   JSON. This is expected, since they're import material. Any agent in the
   account can read them, and anything placed in this account should be
   treated as agent-readable. Move them out after importing if that matters.

## 3. Is signing in through the browser pane a concern?

**Yes, today, for one reason: there's only one database.**

- When Stan signs in on `https://localhost:3000` in the pane, Supabase issues
  a session for his **production** user. The localhost server and production
  share the auth system.
- Helm's browser client is `createBrowserClient` (`@supabase/ssr`), which
  keeps the session in `sb-…-auth-token` cookies that page JavaScript can
  read. That's how it works, not a bug. The agent can run JavaScript in the
  pane (`javascript_tool`), so it can read that session, including the refresh
  token. That token works against production, from anywhere, until Stan signs
  out of that pane or the session expires.
- The pane's profile persists across sessions. It stays signed in after this
  conversation ends.
- What that session can do is limited to what Stan can do in Helm, through
  RLS and the trip checks. That's less than the service-role key, which the
  dev server already exposes. So the pane adds a **second, longer-lived** way
  to the same data, not a bigger one.

**With a separate development database**, the pane signs in to a test
account in a test database. The cookie is worth nothing outside development,
and the agent can sign in with test credentials itself, so Stan doesn't have
to. Browser testing then becomes low-risk and faster.

**Until then:** sign the pane out after each testing session. Stan does that
himself, because agents never sign out of his sessions. And don't sign in to
`helm-gilt.vercel.app` in the pane unless a test needs production.

## 4. A separate development database

### What it changes

| | Today (one database) | With a dev database |
|---|---|---|
| Key the dev server holds | production service-role | dev project's key only |
| A rogue or fooled agent's reach | all production Helm data | test data |
| Browser-pane sign-in | Stan's production account | a test account |
| A bad migration | breaks production at once | breaks dev; fixed before release |
| Test writes and deletes | production rows | test rows |
| Key rotation | pointless (dev gets the new key) | meaningful: production keys then live only in Vercel |
| Bypass variable in dev | reaches production data | harmless |

After this, production can be reached only through a release, which Stan
reviews with `helm-release`, or through Vercel and Supabase themselves. That's
the same boundary the account already gives GitHub.

### Options

**Constraint (Stan, 2026-11-09):** the Supabase free plan allows two projects,
and Orb and Helm use both. Upgrading costs $25 a month, which is too much. That
rules out A and B.

| Option | Verdict |
|---|---|
| A. A second hosted Supabase project (`helm-dev`) | **Ruled out (cost).** It would have been the simplest: iPad and iPhone work unchanged, and there's no new software. |
| B. Supabase branching (a preview branch of the production project) | **Ruled out (paid plan).** |
| **C. Local Supabase on the Mac (Supabase CLI + a container runtime)** | **Recommended now.** Free, and the data never leaves the Mac. Needs a one-time admin install of a container runtime, plus a fix so the iPad and iPhone can reach it (below). |
| D. A second free organisation | Not recommended. Supabase may count free projects across all organisations a person owns (*unverified*), and working around a plan limit risks the account. |
| E. Keep one database, and stop using the service-role key in request handling | Doesn't solve the problem. The dev server would still act as Stan through his session, and his session reaches essentially all of Helm's data. |

### Option C in more detail

- **What runs:** the Supabase CLI (`npx supabase`, run as `developer`, no
  admin needed) starts Postgres, Auth, the REST API and a local mail catcher
  in containers. The mail catcher shows sign-in codes on a local web page, so
  test sign-ins need no real email.
- **Admin step:** a container runtime. Docker Desktop is free for personal
  use; OrbStack and Colima are alternatives. Stan installs it from the admin
  account, and it then runs under `developer`. It uses about 2 GB of memory
  while running. Stan can stop it when he isn't developing.
- **The iPad and iPhone problem, and its fix:** local Supabase listens on
  plain `http://127.0.0.1:54321`. A page loaded from
  `https://stanleys-macbook-pro.local:3000` can't call that address, because
  browsers block mixed content, and the devices can't reach `127.0.0.1` on the
  Mac anyway. The fix is to send Supabase calls through the dev server:
  - set `NEXT_PUBLIC_SUPABASE_URL` to `https://<same origin>/sb`;
  - add a development-only rewrite in `next.config.ts` from `/sb/*` to
    `http://127.0.0.1:54321/*`.

  `supabase-js` builds its paths (`/auth/v1`, `/rest/v1`) under whatever base
  URL it's given, so this should work for every device using the existing
  certificate. *Unverified until tried.* The first build step is a small test
  of exactly this.
- **Dev keys:** the local stack has its own keys, which the CLI prints. They
  only work on the Mac, so they aren't secrets in practice. Nothing from
  production goes in the dev store for Supabase.
- **Cost:** none. **Effort:** a bit more than option A, because of the
  runtime install and the rewrite.

The steps below were written for option A. For option C, step 1 becomes "S-admin
installs a container runtime; A adds `supabase/config.toml` settings and starts
the local stack", and step 4's Auth settings go in `supabase/config.toml`
instead of a dashboard. Steps 2, 3 and 5–8 are the same.

### What option A takes

**S** = Stan, **S-admin** = Stan in the admin account, **A** = agent.

1. **S — Create the project** `helm-dev` in the Supabase dashboard, in the
   same region as production.
2. **S-admin — Export the production schema.** The repo's migrations start at
   `202608240001`; the original tables were made before migrations were kept,
   so the repo **can't build the database from scratch**. Stan exports a
   schema-only dump (tables, RLS policies, functions, triggers, no rows) with
   the database password, which agents never hold. For example, `pg_dump
   --schema-only --schema=public` against production's connection string.
   Stan does this from the admin account or Supabase's SQL tools, not where
   agents run.
3. **A — Review the dump**, then **S** applies it to `helm-dev`. The review
   covers RLS policies (each has its `(SELECT auth.uid())` wrapper), functions
   (the ten `.rpc()` functions Helm calls), no production-only grants, and no
   data. Agents read the schema file only; it holds no secrets.
4. **S — Set up Auth** in `helm-dev`:
   - email one-time code (Helm's login and create-account), and passkeys if
     wanted;
   - site URL and redirect URLs for `https://localhost:3000` and
     `https://stanleys-macbook-pro.local:3000`.

   Supabase's built-in email sender is rate-limited, which is fine for a few
   test sign-ins.
5. **A — Seed test data.** A script or SQL file creates a test trip, built by
   copying a production trip's shape, never its personal details. Test users:
   one for Stan and one for the agent's browser testing. Their credentials go
   in a project seed file, so the agent never needs Stan's.
6. **S — Point the dev store at it.** Use `helm-secrets-set` for
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `SUPABASE_SECRET_KEY`. While there, consider separate development keys for
   the others:
   - Anthropic: a separate key with a spend limit;
   - Google Maps: a separate key restricted to localhost;
   - Google OAuth: a separate dev client, or keep the shared one. Its secret
     is the production one.
7. **S — Rotate the production keys** once the dev store no longer holds them
   (deferred item 9 in `docs/helm-secrets-encryption-plan.md`). Update Vercel,
   redeploy, then revoke the old values.
8. **A — Process and documentation.** Update AGENTS.md (Environments,
   migrations), HANDOFF, and the release checklist (below).

### The new risk it brings: two schemas

Migrations would be applied twice: to `helm-dev` while building, and to
production at release. Forgetting the production step would make a release
fail on production. Mitigations:

- Every changelog entry that adds a migration names it, and HANDOFF records
  "applied to dev / applied to production" separately.
- `helm-release --check` lists the migration files added since the last
  release, so Stan sees them before publishing. That's a small change to an
  admin-installed script, so it needs a separate approval.
- Apply to production **before** pushing the release. Migrations are written
  idempotently and additive-first, so the old code keeps working on the new
  schema.
- An occasional schema comparison (dev dump vs production dump) catches
  drift.

### What stays exposed afterwards

- **A release can still carry harmful code.** That remains the review gap
  (2026-10-26 item 9). The diff shown by `helm-release` is the checkpoint.
- Production testing that genuinely needs production, for example Connect
  Google from the iPad and iPhone, still uses Stan's real account. That's
  done in Stan's own browser, not the pane.
- Whatever sits in the `developer` account (§2 item 8).

### Database health impact

No new query patterns, tables, Realtime use or write frequency on production.
With option C the dev database is on the Mac, so production carries less load
(no test traffic).

## 5. Recommended order

| # | Change | Who | Effort |
|---|---|---|---|
| 1 | ~~Confirm `BYPASS_AUTH_USER_ID` is not set in Vercel~~ **Done: not set (Stan, 2026-11-09)** | S | — |
| 2 | ~~Sign the browser pane out of Helm after testing, until #4 is done~~ **No longer needed: the pane uses local test accounts (2026-11-11)** | S | none |
| 3 | Check Codex's `trusted` setting for Helm and remove it if it relaxes approvals | S, A researches | minutes |
| 4 | ~~**Local development database (option C, §4)**~~ **Done 2026-11-11** | S-admin + A | an afternoon or two |
| 5 | ~~Rotate production keys (after #4)~~ **Supabase secret key replaced 2026-11-11**; Anthropic, Maps, Google kept (decision 3) | S | under an hour |
| 6 | Gate the bypass to development and re-enable `proxy.ts` login (code change, needs approval) | A | small |
| 7 | Outgoing-connection monitor (LuLu) for `developer` | S-admin | minutes |
| 8 | Managed Claude settings (root-owned deny rules) | S-admin | small |

Items 1–3 are quick checks. Item 4 is the one that changes the answer to "can
an agent reach production data?" from yes to no.

## 6. Questions for Stan

1. ~~Is `BYPASS_AUTH_USER_ID` set in Vercel?~~ No, for Orb or Helm (Stan,
   2026-11-09).
2. ~~Supabase plan?~~ Free, two projects, both used. $25 a month for Pro is
   too much (Stan, 2026-11-09). Option A is ruled out.
3. ~~Go ahead with option C, and which container runtime?~~ Yes, with Docker
   Desktop (Stan, 2026-11-09). Build plan: `docs/local-dev-database-plan.md`.
4. ~~Separate Anthropic, Maps and Google OAuth keys?~~ No; keep the shared ones
   for now (Stan, 2026-11-09).

All questions are answered.
