# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.03.0016` (local, not pushed; 4 commits ahead of `origin/main`)
- **Branch:** main
- **Dev server start (changed 00.03.0015):** plain `npm run dev` now refuses to start. Until `docs/helm-secrets-encryption-plan.md` steps 4–7 are done, use `HELM_DEV_CERT=localhost+1.pem HELM_DEV_KEY=localhost+1-key.pem npm run dev`; afterwards, `/usr/local/helm-bin/helm-dev`
- **Dev server:** user-started on port 3000 in the `developer` account; devices use `https://stanleys-macbook-pro.local:3000` (Bonjour only). Leaf `localhost+1.pem` re-issued 2026-10-16 from the admin mkcert CA for `localhost`, `127.0.0.1`, `::1`, `Stanleys-MacBook-Pro.local` (verified, expires 2029-01-16)
- **Development account:** canonical clone `/Users/developer/Projects/helm`; read-only GitHub token; releases via `/Users/Shared/helm-review.git` (`review` remote not yet configured). See Orb `docs/orb-non-admin-development-account-plan.md`
- **Live URL:** https://helm-gilt.vercel.app

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | Active-record counts + Checklist/Itinerary/Hotel attention aggregation | 00.03.0000 |
| Checklist | Functional + WARN system + required validation + scroll-to-error | 00.02.0026 |
| Packing | Functional — checkboxes rebuilt as native inputs | 00.01.0157 |
| Key Info | Functional + required validation | 00.02.0014 |
| Transportation | Functional + WARN system + source-owned itinerary timing metadata | 00.02.0048 |
| Hotels | Functional + WARN system + source-owned check-in/check-out itinerary timing | 00.02.0048 |
| Flights | Functional + local endpoint timing + source-owned departure/arrival itinerary timing | 00.02.0048 |
| Restaurants | Functional + WARN system + source-owned reservation itinerary timing | 00.02.0048 |
| Itinerary | Explicit rows; shared-city zones, Time TBD, cross-zone ranges, Calendar indicator; All Day/Time TBD calendar opt-in | 00.03.0011 |
| Printing | Packet + server-data 3×5 PDF modes; Hotel phone and city included | 00.03.0009 |
| Calendar | Secondary-calendar clearing, rebuild queue, deleted-event cleanup; Itinerary all-day events dated from their day | 00.03.0011 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized; New Trip repaired; transactional Copy Trip added | 00.02.0054 |
| Version System | Update banner + What's New + dashboard, trip footer, and sidebar labels | 00.02.0051 |

---

## Last Session Completed

**2026-10-21 — Claude secret-read guardrails + encrypted dev-secrets launcher, step 1 (Claude Code, Opus 5.5) — v00.03.0014–0015**

1. `562c465` (v00.03.0014): `.claude/settings.json` Read denies for `./.env.local` and `//Users/developer/Project-secrets/**`, plus Bash denies for cat/head/tail/less/more/grep/rg/sed/awk/cut/strings/xxd/od/base64/cp/source on those paths. These are guardrails, not enforcement. Verified: `head -c 0 .env.local` was refused.
2. `11f9eae` (v00.03.0015): plan step 1, approved by Stan with four revisions. `scripts/security/{helm-dev,helm-secrets-seal,helm-secrets-set,test-helm-launcher.sh}`, a `package.json` dev guard, launcher denies, and `docs/helm-secrets-encryption-plan.md`. Decisions: `/usr/local/helm-bin`, a separate Helm passphrase, `ANTHROPIC_API_KEY` optional. `test-helm-launcher.sh` passes everything except install integrity (`/usr/local/helm-bin` doesn't exist yet — expected until step 4).
3. Finding: `BYPASS_AUTH_USER_ID` is gated only by being set (no `NODE_ENV` check). When set, `getDataClient()` uses the service-role key, and the gcal routes require it. `proxy.ts` has login disabled in every environment. See plan §2.1. Stan's decision is still open.
4. Finding: Orb's `test-orb-launcher.sh` uses bare `! cmd` checks, which can never fail under `set -e`. That's an Orb follow-up.
5. `.claude/settings.local.json` gained `Bash(grep -v '^--$')` from an "always allow" prompt. Not removed yet; Stan to decide.
6. Not pushed. Plan steps 2–11 are Stan's.
7. **2026-10-22**, `4013afa` (v00.03.0016): Google Calendar works with normal sign-in (`docs/gcal-session-auth-plan.md`). New `lib/gcal/request-user.ts`. Every Calendar route returns 401 when signed out and 403 without a `trip_members` row; OAuth state carries a nonce bound to an httpOnly cookie. The bypass still wins wherever it is set. tsc, eslint (still 11 warnings, none new) and `next build` pass. **Verified by Stan 2026-10-22** with a real login and the bypass commented out in `.env.local`: all five plan §6 checks passed.
8. **2026-10-22, Supabase SMTP fixed (no code change):** email-code login failed with `535 Authentication credentials invalid`. Helm's Supabase project (`adezucorxeybuwajeuqd`, separate from Orb's `livwkbnkdlrbmzgythys`) sends through Resend, and its key had been deleted (only Orb's key remained). Stan created a Helm-only Resend key (`Helm Supabase SMTP`, sending access) and saved it in Helm's Supabase SMTP settings. Login verified on localhost. Keep the two projects' Resend keys separate.

---

## Uncommitted Changes

- `HANDOFF.md` (modified)

---

## Key Decisions

- **Dashboard is CRUD hub**: All trip management happens on the dashboard. Trip detail view is read-only + import + calendar.
- **Trip status lifecycle**: Draft → Upcoming → Active → Archived. Upcoming = confirmed but not yet traveling.
- **force-dynamic on mutation pages**: Any page where client actions mutate data and calls `router.refresh()` must export `const dynamic = 'force-dynamic'`.
- **Version bump = production push**: Every version change ships. No version exists only in dev.
- **Auth shell variant system**: Variant A (navy + stars + wheel) is default. Variant B preserved via DEV toggle.
- **Service worker**: network-first for navigation, cache-first for static assets. Disabled in development.
- **Dev bypass**: server-side `BYPASS_AUTH_USER_ID` + login form `dev@dev.local`. **Corrected 2026-10-21:** only the login-form shortcut is development-gated (`isDev`). The server variable is honoured wherever it is set, and `proxy.ts` has login disabled in every environment (`docs/helm-secrets-encryption-plan.md` §2.1).
- **Branching**: Currently working on main directly. May evolve to feature branches merged to main for production — same version/push principle applies.
- **Scroll-to-first-error pattern**: Shared utility in `lib/form-utils.ts` finds first `role="alert"` inside the active `role="dialog"` and scrolls into view. All edit forms use toast + scrollToFirstError() on validation failure.
- **Help button over settings page**: What's New lives in a ResponsiveSheet opened from Help button. Extensible for future sections without committing to a full settings page.
- **Update banner at very top**: Fixed above header (z-index 110 > header 100), header offsets down via `onVisibilityChange` callback + `BANNER_HEIGHT` constant.
- **Centralized section types**: `types/sections.ts` defines typed interfaces for all DB section tables. Import from there instead of using `any` for Supabase query results.
- **Calendar lifecycle**: included dirty records create/update events; excluded dirty records delete any stored remote events before clearing IDs and dirty state.
- **Calendar authority**: a stored Google calendar ID is only a pointer; Google CalendarList validation determines whether the calendar still exists and is accessible.
- **Flight time contract**: Helm displays airport-local time with its date-correct timezone abbreviation. Persist and sync the real instant computed from local date/time plus IANA timezone; calendar applications render that instant in the viewer's active timezone.
- **Timezone selector identity**: one option per stored IANA identifier; cities sharing identical rules use a combined label rather than duplicate values.
- **TBD timing identity**: `day_id` attaches an item to a dated itinerary day; a non-all-day null `start_time` intentionally represents Time TBD.
- **Clear means rebuild**: Clear Calendar deletes Google events, removes obsolete event IDs, and marks every included record dirty for the next Update All.
- **Delete means pending Calendar removal**: soft-deleted linked records remain dirty tombstones until Update All removes remote events and clears their stored IDs.
- **One print data boundary**: Both 8.5×11 packets and 3×5 cards load data through the authenticated print route. Exact-size cards retain the validated `html2canvas` → `jsPDF` engine and Epson-tested margins.

---

## Next Priorities

1. Release v00.03.0016 (Calendar verified 2026-10-22). Release: as `developer`, `git -C /Users/developer/Projects/helm remote add review /Users/Shared/helm-review.git && git -C /Users/developer/Projects/helm push review main`; as admin, `git clone /Users/Shared/helm-review.git ~/Release/helm && cd ~/Release/helm && git remote add github https://github.com/sbaptista/helm.git && git fetch github && git log --oneline github/main..origin/main`, then `cd ~/Release/helm && git push github main && cd ~ && rm -rf ~/Release/helm`; as `developer`, `git -C /Users/developer/Projects/helm fetch origin`.
2. Stan works through `docs/helm-secrets-encryption-plan.md` steps 2–10: review, push to review (approval in chat; add the `review` remote first), admin install, TLS move, `BYPASS_AUTH_USER_ID` decision, seal, test, rotate the three keys (check Vercel first), remove plaintext. The agent then runs step 8 (`test-helm-launcher.sh`) and step 11 (AGENTS.md).
3. Stan searches Knowledge for related entries ("all day", "Time TBD", "gcal_include", "UpdateBanner") and supersedes any older entry saying All Day/Time TBD items cannot sync to the calendar.
4. Stan continues recreating the Itinerary and reports issues as encountered.
5. Run Calendar Update All and verify the deleted `Arrive SEA` event is removed and the currently checked Itinerary record is recreated.
6. Activate the remaining intended Add to Google Calendar checkboxes, then verify complete event creation/deletion behavior.
7. Stan verifies all six 3×5 PDF categories and physical Epson output.
8. Work down the remaining 11 lint warnings.
9. **Security review parked for later** — `/Users/developer/Projects/orb/docs/agent-security-review-2026-09-30.md` covers agent exposure (Helm's plaintext service-role key, GitHub/iCloud reach, Codex trust), Vercel Config vs Secret vars, separate macOS user, Track A (agent CRU on Knowledge/todos) and Track B (dev databases; Helm as pilot). §9 has Stan-only quick wins; §11 lists pending decisions (§11.1, separate macOS user, decided 2026-10-14).

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-10-21 — Claude Code (Opus 5.5)
