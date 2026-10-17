# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.03.0013` (local, not pushed)
- **Branch:** main
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

**2026-10-16 — Development-account move: Bonjour dev origin + AGENTS.md paths (Claude Code, Opus 5.5) — v00.03.0013**

1. `next.config.ts` `allowedDevOrigins` is now `['stanleys-macbook-pro.local']` (was the stale `192.168.86.90`). Stan verified Helm on Mac, iPad and iPhone through `https://stanleys-macbook-pro.local:3000` before the commit.
2. `AGENTS.md`: `/Users/developer` paths (version file, shared include, main directory, handoff, changelog, worktree patch command), Bonjour device URL, review-repository release path and admin-account rules.
3. Not pushed. The review remote and fresh Codex setup are still pending (Orb plan §1a).

---

## Uncommitted Changes

- None.

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

1. Stan searches Knowledge for related entries ("all day", "Time TBD", "gcal_include", "UpdateBanner") and supersedes any older entry saying All Day/Time TBD items cannot sync to the calendar.
2. Stan continues recreating the Itinerary and reports issues as encountered.
3. Run Calendar Update All and verify the deleted `Arrive SEA` event is removed and the currently checked Itinerary record is recreated.
4. Activate the remaining intended Add to Google Calendar checkboxes, then verify complete event creation/deletion behavior.
5. Stan verifies all six 3×5 PDF categories and physical Epson output.
6. Work down the remaining 11 lint warnings.
7. **Security review parked for later** — `/Users/developer/Projects/orb/docs/agent-security-review-2026-09-30.md` covers agent exposure (Helm's plaintext service-role key, GitHub/iCloud reach, Codex trust), Vercel Config vs Secret vars, separate macOS user, Track A (agent CRU on Knowledge/todos) and Track B (dev databases; Helm as pilot). §9 has Stan-only quick wins; §11 lists pending decisions (§11.1, separate macOS user, decided 2026-10-14).

---

## Session Rules (always enforce)

- **Permission required before:** any code implementation or build changes.
- **Never `git push` without Stan's explicit in-chat approval.** (Wait for Stan to commit — do not auto-commit).
- **Always bump version** on every local change — no exceptions.

---

## AI Tool Used Last Session

2026-10-16 — Claude Code (Opus 5.5)
