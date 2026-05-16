# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0020`
- **Branch:** main
- **Dev server:** user-started on localhost:3000
- **Live URL:** https://helm-gilt.vercel.app

---

## Section Status

| Section | Status | Since |
|---|---|---|
| Overview | Functional — section title restored | 00.02.0000 |
| Checklist | Functional + WARN system + required validation | 00.02.0014 |
| Packing | Functional — checkboxes rebuilt as native inputs | 00.01.0157 |
| Key Info | Functional + required validation | 00.02.0014 |
| Transportation | Functional + WARN system + action_note + required validation | 00.02.0014 |
| Hotels | Functional + WARN system + action_note + required validation | 00.02.0014 |
| Flights | Parity build complete + WARN system + required validation | 00.02.0014 |
| Restaurants | Full redesign complete + WARN system + required validation | 00.02.0014 |
| Itinerary | Parity declared complete + WARN system + required validation | 00.02.0014 |
| Printing | 3x5 cards overhauled | 00.01.0059 |
| Calendar | gcal_include opt-in architecture complete | 00.01.0159 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 8-digit code flow + dev bypass | 00.02.0016 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |

---

## Last Session Completed

**2026-05-15 — HELM-53 fix + AGENTS.md/HANDOFF.md overhaul**

### HELM-53 — Calendar hangs when updating (closed)
- Root cause: `CalendarModal.startSync()` did not check `res.ok` before reading response as SSE stream. Server errors (404/500) left the progress modal stuck with no close button.
- Added `res.ok` guard — on error, shows error message and enables close.
- Added `receivedComplete` safety net — stream end without complete event still sets done state.
- Progress modal X button now works when sync is done (was hardcoded to no-op).
- Server now pre-counts dirty records and sends `current`/`total` with each progress event.
- Added `progressError` state — shows "Sync Failed" title on error vs "Calendar Up to Date" on success.
- Files: `components/advisor/CalendarModal.tsx`, `app/api/gcal/push/trip/[tripId]/route.ts`

### Infrastructure — AGENTS.md + HANDOFF.md pattern
- Created `/Users/stanleybaptista/Projects/shared/AGENTS.md` for cross-project conventions (working rules, AI roles, Orb API, Knowledge Repo, git conventions).
- Rewrote Helm's `AGENTS.md` — project-specific only, references shared file.
- Created this `HANDOFF.md` — living session file replacing Downloads-based handoff exports.
- Updated Orb's `AGENTS.md` — references shared file, removed duplicated content.

### Other
- Removed stray `~/package.json`, `~/package-lock.json`, `~/node_modules` that caused Turbopack to resolve tailwindcss from wrong root.
- Google OAuth re-authorized (token had expired after 17 days in Testing mode).

---

## Key Decisions

- **Auth shell variant system**: Variant A (navy + stars + wheel) is default. Variant B (clean header band) preserved in codebase via DEV panel toggle. Remove Variant B when no longer needed.
- **Service worker**: network-first for navigation (not stale-while-revalidate). Eliminates hydration errors from stale cached HTML.
- **Dev bypass**: two layers — server-side `BYPASS_AUTH_USER_ID` and login form `dev@dev.local` match. Both disappear in production.

---

## Next Priorities

No outstanding Helm items. Check Orb backlog (`product=HELM`) for new tickets.

---

## AI Tool Used Last Session

2026-05-15 — Claude Code (Opus 4.6)
