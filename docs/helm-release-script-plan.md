# One-command release from the admin account (`helm-release`)

**Status:** Approved 2026-10-22 (typed-version confirmation; build before the
next release). **Built 2026-10-22** (v00.03.0018, committed locally, not pushed).
`test-helm-launcher.sh` exercises it against throwaway repositories: 2
nothing-to-release, 1 publish, 3 refusals. Not yet installed or run against the
real review repository and GitHub.

**Unverified:** whether the admin account can clone the review repository
without a one-time `safe.directory` setting. The script passes
`-c safe.directory`, and if the clone still fails it prints the one-time
`git config --global --add safe.directory /Users/Shared/helm-review.git`
command. This can't be tested from `developer`.
**Author:** 2026-10-22 — Claude Code (Opus 5.5)
**Chosen approach:** Option 1 of the three discussed 2026-10-22: keep the two
macOS accounts and reduce each side to one command. Option 2 (passphrase SSH
key in `developer`) and Option 3 (merge on GitHub) were not chosen.
**Governing release model:** Orb `docs/orb-non-admin-development-account-plan.md`
§8–8a. This plan changes how Stan carries out the admin half, not who may
publish.

## 1. Problem

A release today is two account switches and a hand-typed sequence in the
admin account:

```bash
git clone /Users/Shared/helm-review.git ~/Release/helm && cd ~/Release/helm && git remote add github https://github.com/sbaptista/helm.git && git fetch github && git log --oneline github/main..origin/main
cd ~/Release/helm && git push github main && cd ~ && rm -rf ~/Release/helm
```

It works, but every step is manual and nothing checks the release rules: a
version bump, a changelog entry, fast-forward only.

## 2. Design

### 2.1 What Stan does per release

| Account | Command |
|---|---|
| `developer` | `git -C /Users/developer/Projects/helm push review main` (unchanged; needs Stan's approval in chat when an agent is involved) |
| admin | `/usr/local/helm-bin/helm-release` |

Optional, to make switching cheap: turn on macOS Fast User Switching and keep
one admin Terminal window open. That is a macOS setting for Stan, not part of
the build.

### 2.2 What `helm-release` does

Run in the admin account. Everything happens in a fresh temporary directory
that is deleted on every exit path.

1. **Clone the review repository** (`/Users/Shared/helm-review.git`, fixed)
   into a `mktemp -d` directory. Nothing from the clone is executed: no npm, no
   scripts, no hooks (git doesn't clone hooks), so agent-written content is
   only ever read.
2. **Fetch GitHub `main`** (`https://github.com/sbaptista/helm.git`, fixed).
3. **Refuse unless all of these hold:**
   - The review `main` is strictly ahead of GitHub `main`, and GitHub `main` is
     an ancestor of it (fast-forward only; there is no force option).
   - `lib/version.ts` differs from GitHub's: the version was bumped.
   - `lib/changelog.ts` has an entry for exactly that version (the release
     documentation rule in AGENTS.md).
4. **Show:** the commit list, `git diff --stat` against GitHub `main`, the
   old and new version, and the new changelog entry.
5. **Ask Stan to type the new version** (for example `00.03.0017`) to
   confirm. Anything else aborts, and nothing is pushed.
6. **Push the exact commit that was shown**: `git push github <sha>:refs/heads/main`.
   The SHA is captured in step 4, so nothing that changed after the review can
   be pushed.
7. **Print** the pushed range and `https://helm-gilt.vercel.app` to check the
   version label, then delete the temporary clone.

`helm-release --check` runs steps 1–4 and stops. It needs no confirmation,
pushes nothing, and is safe to run any time.

The script uses only absolute paths (`/usr/bin/git`, `/bin/mktemp`, and so
on), runs with `set -euo pipefail`, `umask 077` and no `set -x`, and never
reads, prints or handles credentials. The push uses the admin account's
existing GitHub sign-in, exactly as today.

### 2.3 Where it lives

- **Source:** `scripts/security/helm-release`, reviewed and released through
  the normal path like the launchers.
- **Installed:** `/usr/local/helm-bin/helm-release`, `root:wheel` `0755`. It
  runs from the admin account; `developer` can execute it but has no GitHub
  credential that can push, so running it there fails at step 6.
- `test-helm-launcher.sh`: add `helm-release` to the fail-closed manifest,
  plus checks: `bash -n`; fixed review and GitHub paths; no `--force`, `-f`
  or `+` refspec; no `npm`, `node`, `npx` or `bash <clone path>`; the
  confirmation compares against the version string.
- `.claude/settings.json`: deny `helm-release` in the same six forms as the
  other launchers (guardrail).

### 2.4 What stays manual

- **Installing or updating anything in `/usr/local/helm-bin`** (`sudo install`)
  stays a manual admin step. A release script that installed launchers would
  run agent-written bytes as root without a separate review.
- **TLS certificate re-issue** stays manual (rare; the CA is admin-only).

## 3. Rollout

The first install has to use the manual path once:

1. **A** — Build `helm-release`, test and deny additions; version bump;
   changelog; commit locally. Run `test-helm-launcher.sh` (install
   integrity fails until step 3, as now).
2. **S** — Review, then release with the manual commands one last time.
   This release can also be v00.03.0017's, if the build is done first.
3. **S-admin** — In the same session, install from the clone, before deleting
   it: `sudo mkdir -p /usr/local/helm-bin && sudo install -o root -g wheel -m 755 ~/Release/helm/scripts/security/helm-release /usr/local/helm-bin/`
   (if the launcher install from the encryption plan happens in that sitting,
   add the other three files to the same command).
4. **S-admin** — Run `/usr/local/helm-bin/helm-release --check`. It should
   report "nothing to release" right after a manual release.
5. Every release after that: the two commands in §2.1.

## 4. Orb

Orb uses the same release model and could use the same script with its own
constants (`/Users/Shared/orb-review.git`, `sbaptista/orb`, its version and
changelog files). That is a separate change in the Orb repository, with its
own manifest (`/usr/local/orb-bin`). It is not part of this plan.

## 5. Database impact

None.

## 6. Decisions for Stan

1. Approve building §2–3 (Helm only).
2. Build it before v00.03.0017 ships, so that release can carry it and you
   install it in the same admin session (recommended), or ship v00.03.0017
   first and add the script in the next release.
3. Confirmation by typing the version (recommended) or a plain `y`.
