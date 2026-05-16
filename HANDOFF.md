# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0025`
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
| Printing | 3x5 cards — triggered from dashboard menu | 00.02.0022 |
| Calendar | gcal_include opt-in architecture complete | 00.01.0159 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 8-digit code flow + dev bypass | 00.02.0016 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized — ellipsis menu, status pills, force-dynamic | 00.02.0025 |

---

## Last Session Completed

**2026-05-16 — Dashboard CRUD redesign + polish + production fixes**

### Dashboard CRUD centralization (v00.02.0022)
- All trip actions (Edit, Delete, Archive, Clear Data, Print, status change) moved to dashboard via ellipsis menu on trip cards.
- Removed redundant "View Trip" button — entire card is clickable.
- Created `TripCardMenu` component with scrollable dropdown (capped at 220px).
- Status pills in dropdown use Badge colors matching the card badge.
- Added `status` to PATCH API whitelist.
- Fixed archive action to set `trip.status = 'archived'`.
- Stripped Edit/Delete/Clear/Print modals from `TripDetailView` (~300 lines removed).
- Stripped Print/Edit/Clear action buttons from `TripSidebar` — kept navigation, Logs, Calendar, Import.
- Files: `DashboardView.tsx`, `TripCard.tsx`, `TripCardMenu.tsx` (new), `TripDetailView.tsx`, `TripSidebar.tsx`, `route.ts`, `clear/route.ts`, `page.tsx`

### Dashboard polish (v00.02.0024)
- Fixed dropdown clipped by card `overflow: hidden` — set to `overflow: visible`, added border-radius to gold accent bar.
- Status lifecycle reordered: Draft → Upcoming → Active → Archived (Upcoming = confirmed but not yet traveling).
- Filter pills reordered to match lifecycle.

### Production fix (v00.02.0025)
- `router.refresh()` was serving cached data in production (worked in dev because Next.js never caches in dev mode). Added `export const dynamic = 'force-dynamic'` to dashboard page.
- Principle: dev and production must behave identically. Same version = same behavior, regardless of environment.

### Prior session work (2026-05-15)
- HELM-48 perf fix (loading skeleton, Suspense streaming, lazy tabs, query dedup)
- HELM-53 calendar sync hang fix
- AGENTS.md/HANDOFF.md cross-project pattern

---

## Key Decisions

- **Dashboard is CRUD hub**: All trip management happens on the dashboard. Trip detail view is read-only + import + calendar.
- **Trip status lifecycle**: Draft → Upcoming → Active → Archived. Upcoming = confirmed but not yet traveling.
- **force-dynamic on mutation pages**: Any page where client actions mutate data and call `router.refresh()` must export `const dynamic = 'force-dynamic'`.
- **Version bump = production push**: Every version change ships. No version exists only in dev.
- **Auth shell variant system**: Variant A (navy + stars + wheel) is default. Variant B preserved via DEV toggle.
- **Service worker**: network-first for navigation.
- **Dev bypass**: server-side `BYPASS_AUTH_USER_ID` + login form `dev@dev.local`. Both disappear in production.
- **Branching**: Currently working on main directly. May evolve to feature branches merged to main for production — same version/push principle applies.

---

## Next Priorities

- Visually test remaining dashboard actions in production (edit, delete, archive, clear, print).
- Check Orb backlog (`product=HELM`) for new tickets.

---

## AI Tool Used Last Session

2026-05-16 — Claude Code (Opus 4.6)
