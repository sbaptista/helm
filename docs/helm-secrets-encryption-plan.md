# Helm secrets encryption plan

**Status:** Proposed 2026-10-21. **Step 1 approved and built 2026-10-21**
(v00.03.0015, committed locally, not pushed). Steps 2–11 are Stan's.
**Author:** 2026-10-21 — Claude Code (Opus 5.5)
**Model:** Orb's `orb-dev` / `orb-secrets-seal` / `orb-secrets-set` /
`test-orb-launcher.sh` (Orb `scripts/security/`, as of `d7167ae`).

## 1. Problem

Helm's development secrets are plaintext on disk:

- `/Users/developer/Projects/helm/.env.local` is a symlink to
  `/Users/developer/Project-secrets/helm-secrets/.env.local` (plaintext,
  `developer`-owned).
- Next.js reads it automatically on `npm run dev`, and any process running as
  `developer` can read it. That includes every AI tool, and it has been that way
  since April 2026.
- The Claude deny rules added in 00.03.0014 are guardrails only. They cover
  Claude Code's own Read tool and a list of shell commands. A command that is not
  listed (`python3`, `node`, `bash -c`, a pipe) still reads the file, and Codex
  and other tools don't read `.claude/settings.json` at all.

Orb fixed the same exposure with a passphrase-encrypted store and a root-owned
launcher. This plan applies that design to Helm.

**What encryption does and does not do.** It protects the file **at rest
only**. Once `helm-dev` runs, every decrypted value is in the dev-server
process environment. Code an agent can edit can still reach those values: any
route handler, `next.config.ts`, `proxy.ts`, or a dependency. They can also leak
through anything the server logs or returns. This is the same limit as Orb's F8.
What the store removes is the standing plaintext file: a secret is reachable
only while Stan has unlocked the server, and only through code that runs inside
it.

## 2. Research summary

- **Next.js 16.2.5 env loading** (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`,
  "Environment Variable Load Order"): `process.env` is checked first, before any
  `.env*` file. A launcher that exports the decrypted variables and then `exec`s
  `next dev` needs no `.env.local`. `NEXT_PUBLIC_*` values are inlined from the
  environment the server runs in, so that also works.
- **Names Helm's code reads** (from `grep process.env.*`, not from the file,
  which agents don't read): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
  `ANTHROPIC_API_KEY`, `BYPASS_AUTH_USER_ID`, `NODE_ENV` (set by Next). Stan
  confirms these against the real file himself (decision 2026-10-21).
- **Orb's install manifest fails closed on extra files.** `test-orb-launcher.sh`
  treats any file in `/usr/local/orb-bin` that isn't in its manifest as an
  error, so Helm uses its own `/usr/local/helm-bin` (decided 2026-10-21).
- **Helm's TLS leaf** (`localhost+1.pem`, `localhost+1-key.pem`) sits in the
  repo root, gitignored. It moves to `helm-secrets/tls/`.
- **Production is unaffected** by steps 1–7. Vercel holds its own environment
  variables. Step 9 (key rotation) does affect production; see there.

### 2.1 How `BYPASS_AUTH_USER_ID` is gated (asked 2026-10-21)

**It is gated only by being set. Nothing in the code checks `NODE_ENV`.**

- 41 server files read it, and each one does the same thing: if the variable is
  set, every request is that user, with no session check.
- `lib/supabase/data-client.ts`: when it's set, `getDataClient()` returns a
  client built with `SUPABASE_SECRET_KEY`, the service role, which bypasses RLS.
- `proxy.ts` returns `NextResponse.next()` on its first line ("AUTH BYPASS —
  remove to re-enable login"), so the login redirect is disabled in every
  environment, production included.
- The only part that is development-gated is the `dev@dev.local` shortcut in
  `app/auth/login/LoginForm.tsx` (`isDev`). The HANDOFF Key Decision "Both
  disappear in production" is true for the login form only, not for the server
  variable.
- **The Google Calendar routes require it.** `api/gcal/{auth,calendar,calendar/clear,push,status}`
  each have `getAuthUserId()`, which returns the bypass ID or throws
  `Not authenticated`. They have no session fallback. Leaving the variable out
  of the dev store means Calendar fails locally, including the Update All re-test
  in step 7.
- Agents can't see whether it is set in Vercel production. If production
  Calendar sync works today, it must be set there. That would mean production
  answers every request as that user with the service-role key, with login
  bypassed.

What the scripts do now (default "leave it out"): it is not required by
`helm-dev` or `helm-secrets-seal`, and `helm-secrets-set` can remove it but
cannot set it. If it is in `.env.local` when Stan seals, it goes into the store
and `helm-dev` exports it. To leave it out, delete the line before step 5, or
run `helm-secrets-set --remove BYPASS_AUTH_USER_ID` afterwards.

## 3. Design

### 3.1 Store

| Item | Value |
|---|---|
| Encrypted store | `/Users/developer/Project-secrets/helm-secrets/helm.env.enc`, `0600` |
| Directories | `Project-secrets` and `helm-secrets` both `0700`, owned by `developer` |
| Cipher | `openssl enc -aes-256-cbc -pbkdf2 -iter 210000 -salt` (`/opt/homebrew/bin/openssl`), identical to Orb |
| Passphrase | **Separate from Orb's** (decided 2026-10-21) |
| TLS leaf | `helm-secrets/tls/helm-dev.pem` and `helm-dev-key.pem`, `0600`, dir `0700` |
| Plaintext | none after step 10: `helm-secrets/.env.local` and the repo symlink are removed |

Known limitation inherited from Orb: AES-CBC has no MAC. The launcher trusts
only openssl's exit status, never a count of parsed lines (Orb's R4-N1 fix),
which catches truncation. It does not authenticate the content.

### 3.2 Scripts (`scripts/security/`, built in step 1)

| Script | Purpose | Based on |
|---|---|---|
| `helm-dev` | Preflight, verify the TLS leaf, prompt for the passphrase, decrypt into the environment, `exec npm run dev` on port 3000. `--check` runs the preflight without unlocking anything | `orb-dev` |
| `helm-secrets-seal` | One-time: encrypt `helm-secrets/.env.local`, re-prompt and verify the copy byte for byte, and with `--remove-plaintext` delete the source | `orb-secrets-seal` |
| `helm-secrets-set` | Change one value, or remove an optional one, inside the store with no plaintext temp file. Settable: the six required names plus `ANTHROPIC_API_KEY`. Removable: `ANTHROPIC_API_KEY`, `BYPASS_AUTH_USER_ID` | `orb-secrets-set` |
| `test-helm-launcher.sh` | Agent-runnable checks (§3.5) | `test-orb-launcher.sh` |

Required names in `helm-dev` and `helm-secrets-seal`: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
`ANTHROPIC_API_KEY` is optional (decided 2026-10-21).

Each script is standalone, a copy adapted from Orb with no shared library.
Installed copies must not source anything an agent can edit.

`helm-dev` refuses to start if any of these hold, all checked before the
passphrase prompt:

- `.env`, `.env.local`, `.env.development` or `.env.development.local` exists
  in the project root, as a file or a symlink (dangling symlinks included).
- The secret root, the Helm directory, the store or the TLS directory isn't
  owned by the current user with the exact modes above.
- The TLS leaf is missing, not `0600`, doesn't cover `localhost`, `127.0.0.1`,
  `::1` and `<LocalHostName>.local`, expires within 7 days, or doesn't match its
  key. When this fires it prints the admin-account `mkcert` re-issue command
  (staging `~/Release/helm-tls`). It is verify-only, as in Orb.

After the prompt, it stops if the decrypt exits non-zero (nothing is loaded) or
a required name is missing.

### 3.3 Dev-server start

`package.json` `dev` now refuses to run without the launcher's certificate
variables, so plain `npm run dev` can't start Helm:

```text
[ -n "$HELM_DEV_CERT" ] && [ -n "$HELM_DEV_KEY" ] || { echo 'helm: start the dev server with /usr/local/helm-bin/helm-dev' >&2; exit 1; }; next dev --experimental-https --experimental-https-cert "$HELM_DEV_CERT" --experimental-https-key "$HELM_DEV_KEY" -H 0.0.0.0 -p 3000
```

**From this commit on, `npm run dev` fails until steps 4–8 are done.** Until
then, start the old way with
`HELM_DEV_CERT=localhost+1.pem HELM_DEV_KEY=localhost+1-key.pem npm run dev`
(the `.env.local` symlink is still in place).

`allowedDevOrigins` stays in `next.config.ts` as it is today. Stan starts the
server by absolute path, to avoid PATH or `~/.zshrc` shadowing:

```bash
/usr/local/helm-bin/helm-dev
```

### 3.4 Install location

**`/usr/local/helm-bin`** (decided 2026-10-21), `root:wheel` `0755`, holding
`helm-dev`, `helm-secrets-seal` and `helm-secrets-set`.

As in Orb, root ownership limits what PATH resolves, not what an agent can run:
`bash scripts/security/helm-dev` still runs the repo copy. The deny rules in
§3.6 and the test's diff against the installed copy detect drift. Neither is a
boundary. The protection is the passphrase: it is never stored, and agents
never see it. **That protection covers the file at rest only (§1).** Once the
server is unlocked, its decrypted environment is reachable from agent-editable
code running in it, the same as Orb's F8.

### 3.5 `test-helm-launcher.sh`

1. `bash -n` on all three launchers.
2. Helper tests from `helm-secrets-set`: replace, add, remove, allowed and
   removable names. `BYPASS_AUTH_USER_ID` is not settable.
3. Required names agree between `helm-dev` and `helm-secrets-seal`, and neither
   requires `ANTHROPIC_API_KEY` or `BYPASS_AUTH_USER_ID`.
4. Fixed roots: project `/Users/developer/Projects/helm`, secret root
   `/Users/developer/Project-secrets`, no `/Users/stanleybaptista` path except
   the one admin staging path. No reference to Orb's store.
5. TLS verify-only cases on throwaway self-signed leaves: 2 accepted, 6 rejected.
6. Plaintext refusal: each of the four env names, as a file and as a dangling
   symlink, in a temp project root.
7. `package.json`: the `dev` guard is present and `localhost+1` is gone.
8. PATH-shadowing detection: a planted copy is caught.
9. Installed integrity against a manifest that fails closed:
   `/usr/local/helm-bin` exists, each launcher is present, `root:wheel` `0755`,
   the bytes match the repo copy, and no unexpected files are there. Then the
   live PATH is clean.

Every must-fail check goes through a `must_not` helper. Bash ignores a negated
command (`! cmd`) under `set -e`, so a bare `! cmd` line can never fail the
test. **Orb's `test-orb-launcher.sh` uses bare `! cmd` lines** (for example
`! is_allowed_name ELEVENLABS_API_KEY` and the `/Users/stanleybaptista` greps).
Those checks can't fail today. That's an Orb follow-up, not changed here.

The test never decrypts anything or prompts for a passphrase, so an agent can
run it. Until step 4 it ends at check 9 with the install-integrity failure, as
expected.

### 3.6 Claude deny additions (built in step 1)

The human-only launchers are denied by bare name, repo path and installed path:
`helm-dev`, `helm-secrets-seal`, `helm-secrets-set`, each as `X`, `X *`,
`scripts/security/X`, `scripts/security/X *`, `/usr/local/helm-bin/X` and
`/usr/local/helm-bin/X *`. The 00.03.0014 read denies stay. These are
guardrails.

## 4. Steps

Who does each step: **A** = agent in `developer`, **S** = Stan in `developer`,
**S-admin** = Stan in the admin account.

1. **A — done 2026-10-21.** Write the three launchers, the test and the deny
   additions; update `package.json`; bump the version; changelog; commit
   locally; run `test-helm-launcher.sh`.
2. **S** — Review the diff (`git show`).
3. **S** — Push to the review repository, with Stan's in-chat approval:
   `git -C /Users/developer/Projects/helm push review main`. The `review`
   remote is not configured yet (HANDOFF, 2026-10-16). Add it first with
   `git -C /Users/developer/Projects/helm remote add review /Users/Shared/helm-review.git`
   (Orb plan §8).
4. **S-admin** — Install from a temporary clone of the review repository, then
   delete the clone (per AGENTS.md; never `sudo` inside `/Users/developer`):
   `git clone /Users/Shared/helm-review.git ~/Release/helm && sudo mkdir -p /usr/local/helm-bin && sudo install -o root -g wheel -m 755 ~/Release/helm/scripts/security/helm-dev ~/Release/helm/scripts/security/helm-secrets-seal ~/Release/helm/scripts/security/helm-secrets-set /usr/local/helm-bin/ && rm -rf ~/Release/helm`
5. **S** — Move the TLS leaf:
   `mkdir -m 700 /Users/developer/Project-secrets/helm-secrets/tls && mv /Users/developer/Projects/helm/localhost+1.pem /Users/developer/Project-secrets/helm-secrets/tls/helm-dev.pem && mv /Users/developer/Projects/helm/localhost+1-key.pem /Users/developer/Project-secrets/helm-secrets/tls/helm-dev-key.pem && chmod 600 /Users/developer/Project-secrets/helm-secrets/tls/helm-dev.pem /Users/developer/Project-secrets/helm-secrets/tls/helm-dev-key.pem`
6. **S** — Decide on `BYPASS_AUTH_USER_ID` (§2.1), then seal with a new
   Helm-only passphrase, keeping the plaintext for now:
   `/usr/local/helm-bin/helm-secrets-seal`
7. **S** — Remove the repo symlink, check, start, and test on Mac, iPad and
   iPhone (sign-in, a Supabase read and write, Google Calendar Update All):
   `rm /Users/developer/Projects/helm/.env.local && /usr/local/helm-bin/helm-dev --check && /usr/local/helm-bin/helm-dev`
8. **A** — Run `test-helm-launcher.sh` (all green now that it is installed).
9. **S — Rotate the exposed keys.** The plaintext was agent-readable from
   April 2026, so treat these as exposed: `SUPABASE_SECRET_KEY`,
   `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`. For each one, issue a new value
   in its console (Supabase, Google Cloud, Anthropic), then
   `/usr/local/helm-bin/helm-secrets-set <NAME>`, then revoke the old value.
   Re-run the step 7 test.
   **Check first whether production uses the same key.** If Vercel uses the
   same Supabase project, the same OAuth client or the same Anthropic key,
   revoking the old value breaks production until Vercel has the new value and
   has redeployed. Update Vercel in the same sitting, before revoking.
10. **S** — Once everything is verified, remove the plaintext:
    `/usr/local/helm-bin/helm-secrets-seal --remove-plaintext`. Then confirm the
    Time Machine disk is encrypted: old backups retain the plaintext, and they
    can't be edited. The admin account's original copy
    (`/Users/stanleybaptista/Project-secrets/helm-secrets/.env.local`) is
    removed when that account's project data is retired (Orb plan, rollback
    window).
11. **A** — Update `AGENTS.md` (Environments, Known Gotchas: start command,
    `.env.local` is gone) and `HANDOFF.md`.

**Rollback before step 10:** put the symlink back
(`ln -s /Users/developer/Project-secrets/helm-secrets/.env.local /Users/developer/Projects/helm/.env.local`)
and start with the `HELM_DEV_CERT=… HELM_DEV_KEY=… npm run dev` form from §3.3.
After step 9, the rotated values exist only in the store, so roll back by
decrypting the store rather than by using the old file.

## 5. Platform and verification notes

- **Mac:** `https://localhost:3000`. **iPad and iPhone:**
  `https://stanleys-macbook-pro.local:3000`. The leaf is moved, not re-issued,
  so device trust is unchanged.
- The passphrase prompt is in Stan's terminal only. No agent or Claude Code
  terminal tab starts the server, which is already the rule.
- **DB impact:** none. No queries, schema, Realtime or write patterns change.

## 6. Decisions

| # | Decision | Answer (2026-10-21) |
|---|---|---|
| 1 | Install location | `/usr/local/helm-bin` |
| 2 | Passphrase | Separate from Orb's |
| 3 | `ANTHROPIC_API_KEY` | Optional |
| 4 | `BYPASS_AUTH_USER_ID` | **Open.** Default: leave it out. Gating is in §2.1; leaving it out breaks local Google Calendar |
| 5 | Required names vs the real file | Stan checks himself |
| 6 | Build step 1 | Approved and built |
