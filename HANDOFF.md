# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0033`
- **Branch:** main
- **Dev server:** user-started on localhost:3000
- **Live URL:** https://helm-gilt.vercel.app

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | Functional — section title restored | 00.02.0000 |
| Checklist | Functional + WARN system + required validation + scroll-to-error | 00.02.0026 |
| Packing | Functional — checkboxes rebuilt as native inputs | 00.01.0157 |
| Key Info | Functional + required validation | 00.02.0014 |
| Transportation | Functional + WARN system + action_note + required validation + scroll-to-error | 00.02.0026 |
| Hotels | Functional + WARN system + action_note + required validation + scroll-to-error | 00.02.0026 |
| Flights | Parity build complete + WARN system + required validation + inline timing errors + scroll-to-error | 00.02.0026 |
| Restaurants | Full redesign complete + WARN system + required validation + scroll-to-error | 00.02.0026 |
| Itinerary | Parity declared complete + WARN system + required validation + scroll-to-error + server-side validation | 00.02.0026 |
| Printing | 3x5 cards — triggered from dashboard menu | 00.02.0022 |
| Calendar | gcal_include opt-in architecture complete | 00.01.0159 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 8-digit code flow + dev bypass | 00.02.0016 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized — ellipsis menu, status pills, force-dynamic + Help button + update banner | 00.02.0031 |
| Version System | Update banner + What's New sheet + changelog + /api/version | 00.02.0031 |

---

## Last Session Completed

**2026-06-03 — Establish ESLint safety baseline (Session 50, Gemini 3.5 Flash)**

1. **Created Backlog Items** — Verified HELM-60 (Phase 2 hooks) and HELM-61 (Phase 3 TS type safety) in the Orb task backlog.
2. **Added Documentation** — Placed the eslint remediation plan at `docs/eslint_remediation_plan.md`.
3. **Updated ESLint Config** — Configured `eslint.config.mjs` to ignore `.claude/` worktrees and temporarily downgrade react hook and typescript explicit any rules to warnings, achieving an exit 0 baseline.
4. **Updated Knowledge Base** — Posted the remediation plan details to the shared Knowledge Repository (ID `c5b9d15c-7221-4c4c-97a7-b5fb9f617321`).

---

## Uncommitted Changes

### Modified
- `AGENTS.md` — aligned instructions, environments, and database health with Orb
- `HANDOFF.md` — this file
- `lib/version.ts` — bumped version to 00.02.0033
- `package.json` — bumped version to 0.2.33
- `lib/changelog.ts` — added release entries for v00.02.0032 and v00.02.0033
- `eslint.config.mjs` — ignored .claude/** worktrees and relaxed rules to warn
- `app/api/trips/import/confirm/route.ts` — autofixed unused directives
- `components/ui/Modal.tsx` — autofixed unused directives
- `package-lock.json` — updated version metadata

### Untracked
- `docs/` — eslint remediation plan
- `supabase/` — local supabase configuration directory

---

## Key Decisions

- **Dashboard is CRUD hub**: All trip management happens on the dashboard. Trip detail view is read-only + import + calendar.
- **Trip status lifecycle**: Draft → Upcoming → Active → Archived. Upcoming = confirmed but not yet traveling.
- **force-dynamic on mutation pages**: Any page where client actions mutate data and calls `router.refresh()` must export `const dynamic = 'force-dynamic'`.
- **Version bump = production push**: Every version change ships. No version exists only in dev.
- **Auth shell variant system**: Variant A (navy + stars + wheel) is default. Variant B preserved via DEV toggle.
- **Service worker**: network-first for navigation, cache-first for static assets. Disabled in development.
- **Dev bypass**: server-side `BYPASS_AUTH_USER_ID` + login form `dev@dev.local`. Both disappear in production.
- **Branching**: Currently working on main directly. May evolve to feature branches merged to main for production — same version/push principle applies.
- **Scroll-to-first-error pattern**: Shared utility in `lib/form-utils.ts` finds first `role="alert"` inside the active `role="dialog"` and scrolls into view. All edit forms use toast + scrollToFirstError() on validation failure.
- **Help button over settings page**: What's New lives in a ResponsiveSheet opened from Help button. Extensible for future sections without committing to a full settings page.
- **Update banner at very top**: Fixed above header (z-index 110 > header 100), header offsets down via `onVisibilityChange` callback + `BANNER_HEIGHT` constant.

---

## Next Priorities

1. Implement Phase 2: Resolving React Hook Side-Effects (HELM-60).
2. Implement Phase 3: Incremental Type Safety & Hygiene (HELM-61).

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-06-03 — Antigravity (Gemini 3.5 Flash)
