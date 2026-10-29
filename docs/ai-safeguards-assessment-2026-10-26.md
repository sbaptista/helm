# AI safeguards assessment — what is protected, and from whom

**Date:** 2026-10-26
**Author:** 2026-10-26 — Claude Code (Opus 5.5)
**Asked by:** Stan, after the v00.04.0003 release and the `orb-agent` Knowledge proposals.
**Status:** Assessment only. No changes proposed here are approved or built.

**Scope:** Stan's MacBook (admin account and the Standard `developer` account),
Stan's personal data, and the Helm and Orb application data (Supabase,
GitHub, Vercel).

**Basis:** Helm `HANDOFF.md` and `AGENTS.md`, shared `AGENTS.md`,
`docs/helm-secrets-encryption-plan.md`, `docs/helm-release-script-plan.md`,
`docs/gcal-session-auth-plan.md`, Orb's `orb-agent` / `orb-agent-approve`
behaviour, and what this session's tools did. The machine itself was **not
audited**; items marked *unverified* need checking.

---

## Summary

| Threat | Protection today |
|---|---|
| Well-behaved agent that makes a mistake | **Good.** Mistakes can't reach production code, the system, the admin account or Orb's database without Stan. |
| Well-behaved agent fed hidden instructions (prompt injection) | **Partial.** Same hard limits as above; written rules don't help, because the agent believes it is helping. |
| Rogue agent with its own agenda | **Partial.** Hard limits hold on GitHub, the OS and Orb writes. While the dev server runs, production Helm data and keys are reachable, and anything the `developer` account can see is exposed. |

The three changes that would improve the rogue-agent picture most: a separate
development database, rotating production keys, and settling the
authentication bypass (§4, items 1–3).

---

## 1. Well-behaved agents that make mistakes

Most of the value achieved is here, and it is real.

- **Production can't change by accident.** The `developer` account's GitHub
  token is read-only (a push returns 403, verified 2026-10-16). Production
  changes only when Stan runs `/usr/local/helm-bin/helm-release` in the admin
  account. It refuses anything that isn't a fast-forward with a version bump
  and a matching changelog entry, shows every commit and file, and asks for
  the version to be typed. The v00.04.0003 release (2026-10-25) exercised
  this, including three earlier documentation commits that rode along and
  were visible before publishing.
- **The system and the admin account are out of reach.** `developer` is a
  Standard account. A careless `rm`, a bad install script or a wrong `sudo`
  can't change the system or Stan's admin home folder. Installing into
  `/usr/local/helm-bin` and `/usr/local/orb-bin` is a manual admin step.
- **Orb data is read-only, and writes need Stan.** Agents read through
  `orb-agent`, whose database role (`orb_agent_ro`) can only SELECT. Every
  write is a proposal (`knowledge-create`, prepend-only `knowledge-update`,
  `todo-close`) that Stan applies with `orb-agent-approve` and the master
  passphrase. A banner proposal is refused if the entry changed after it was
  staged. First real use: 2026-10-25 (four entries, two banners), verified by
  read-back.
- **Secrets aren't in plain files.** There is no `.env.local`. Development
  secrets live in a passphrase-encrypted store unlocked only by `helm-dev`;
  the plaintext was removed 2026-10-23. An agent reading the repository, the
  home folder or a backup doesn't pick up keys. The Time Machine disk is
  encrypted (confirmed by Stan 2026-10-23).
- **Guardrails catch common slips.** `.claude/settings.json` denies
  `git push` and reads of the secrets folder. The written rules (plan first,
  wait for Stan's go-ahead, never push) shape behaviour: in the 2026-10-24/25
  session they produced a plan before every build and stopped at the push.

## 2. Are the safeguards needed if agents are well-behaved?

**Yes.** Good intent removes neither of the two realistic failure modes.

1. **Mistakes.** A well-meaning agent can misjudge which machine, folder,
   database or command it is acting on. The separate account and the release
   gate limit how far a mistake can reach.
2. **Hidden instructions (prompt injection).** An agent can be handed
   instructions inside material it reads: a web page, a pasted document, an
   imported travel document, an email, a Knowledge entry. It then acts on
   them believing it is helping. This is the most realistic serious risk
   today. Only limits enforced outside the agent — the account, the token,
   the database role, the passphrase — help, because the agent itself has
   been fooled.

The separate account is not distrust of a particular agent. It is what makes
a mistake or a planted instruction survivable.

## 3. Rogue agents with their own agenda

### What holds (enforced by GitHub, the OS or the database)

- Pushing to GitHub: the token can't push.
- Changing the system or the admin account: `developer` isn't an admin.
- Writing to Orb through `orb-agent`: its role can't write; proposals need
  Stan's passphrase.
- Reading the secrets store at rest: it is encrypted with a passphrase the
  agent doesn't have.

### What a determined agent could get around

1. **Guardrails are not walls.** The deny rules and AGENTS.md live in files
   the agent can edit, and commands can be routed around them (a known gap
   recorded in shared AGENTS.md: wrappers such as `npx` or `docker exec`
   aren't matched). A rogue agent ignores written rules.
2. **The dev server holds the production database key. (Largest gap.)**
   While Stan runs `helm-dev`, the decrypted Supabase service-role key is in
   a process that runs code agents can edit. An agent could add a route that
   reads, changes or deletes **production** Helm data, or sends the key
   elsewhere, and nothing would notice. Localhost and production appear to
   share one Supabase project (`adezucorxeybuwajeuqd`). Recorded in Helm
   AGENTS.md ("Encryption protects the file at rest only").
3. **The authentication bypass.** `BYPASS_AUTH_USER_ID` is honoured wherever
   it is set, not only in development, and login is disabled in `proxy.ts` in
   every environment (`docs/helm-secrets-encryption-plan.md` §2.1). Decision
   still open.
4. **Old keys were never rotated.** Values readable before Vercel variables
   were switched to Secret (2026-10-23) remain valid. Deferred by Stan as an
   accepted risk.
5. **Personal data in the `developer` account.** Anything the account can
   see is exposed: documents, browser sign-ins and Chrome profile, iCloud,
   Keychain items, `~/.ssh`. *Unverified* what this account is signed into.
6. **`orb-agent` reads more than Knowledge.** It can read todos, tickets,
   Orb conversation event logs and database health. If those hold personal
   details, any agent in the account can read them.
7. **Commands can run without a per-command prompt.** The 2026-10-24/25
   session ran in a mode where shell commands executed without asking, so
   Stan's approval was not a checkpoint for each command.
8. **Network access is open.** Nothing limits where the agent's commands or
   the dev server can send data.

**Net:** a rogue agent can't publish code, damage the system or write to Orb
through the broker. While the dev server runs, it could reach production Helm
data, and it can read whatever the `developer` account can see.

## 4. What more could be done without halting AI use

Ordered by value for effort.

| # | Change | Closes | Effort |
|---|---|---|---|
| 1 | **Separate development database** (own Supabase project or branch, test data). The dev server never holds a production key. Security review "Track B". | §3.2 | Medium |
| 2 | **Rotate production keys** once production is the only holder (Supabase service-role, Google OAuth secret, Anthropic, Resend). | §3.4 | Low |
| 3 | **Settle the bypass:** honour `BYPASS_AUTH_USER_ID` only in development, confirm it is unset in production, re-enable login in `proxy.ts`. | §3.3 | Low–medium |
| 4 | **Keep `developer` free of personal data:** no iCloud, no personal Chrome profile or sign-ins, no personal documents; check Keychain and `~/.ssh`. | §3.5 | Low |
| 5 | **Watch outgoing connections** for `developer` with a per-app firewall (LuLu or Little Snitch). Exfiltration becomes visible and blockable. | §3.8 | Low |
| 6 | **Back up production data:** Supabase backups / point-in-time recovery for Helm and Orb, so a bad data change can be undone. Time Machine covers the laptop, not Supabase. | §3.2 impact | Low (may need a paid plan) |
| 7 | **Prompts for risky work:** use prompted mode or Claude Code's sandbox (restricts file and network access for agent commands) for anything touching secrets, auth, release or install paths; keep automatic mode for routine work. | §3.7, §3.1 | Low |
| 8 | **Narrow `orb-agent` reads** to the tables agents need (Knowledge, todos, projects) if conversation logs or tickets hold personal information. | §3.6 | Low (Orb change) |
| 9 | **Review security-sensitive changes before release:** for login, secrets, database access or `/usr/local/*-bin`, read the diff or have a second model review it before `helm-release`. | §3.1 | Ongoing |

Items 1–3 change the rogue-agent answer the most. None of them requires
stopping AI use.

## Related documents

- Orb `docs/agent-security-review-2026-09-30.md` — agent exposure, Vercel
  Config vs Secret, Track A / Track B (parked; its §9 has Stan-only quick
  wins and §11 pending decisions).
- Orb `docs/orb-non-admin-development-account-plan.md` §8–8a — the
  two-account model.
- Helm `docs/helm-secrets-encryption-plan.md` — encrypted store, its
  at-rest-only limit (§2.1 bypass finding, step 9 rotation deferred).
- Helm `docs/helm-release-script-plan.md` — `helm-release`.
