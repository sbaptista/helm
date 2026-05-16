# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0022`
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
| Printing | 3x5 cards overhauled — now triggered from dashboard menu | 00.02.0022 |
| Calendar | gcal_include opt-in architecture complete | 00.01.0159 |
| Logs | Complete — Phase 1–4 done + clear-all option | 00.02.0014 |
| Search | Rebuilt — whole-word toggle, match highlighting | 00.02.0000 |
| Auth (OTP) | Complete — 8-digit code flow + dev bypass | 00.02.0016 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized — ellipsis menu, Draft filter, status change | 00.02.0022 |

---

## Last Session Completed

**2026-05-15 — Dashboard CRUD redesign + HELM-48 perf fix**

### Dashboard CRUD centralization
- All trip actions (Edit, Delete, Archive, Clear Data, Print, status change) moved to dashboard via ellipsis menu on trip cards.
- Removed redundant "View Trip" button from trip cards — entire card is clickable.
- Added "Draft" to filter pills (new order: All, Draft, Active, Upcoming, Archived).
- Created `TripCardMenu` component — dropdown with Edit, Print, status pills (Draft/Active/Upcoming), Archive, Clear Data, Delete.
- Added `status` to PATCH API whitelist (`app/api/trips/[id]/route.ts`).
- Fixed archive action to set `trip.status = 'archived'` (`app/api/trips/[id]/clear/route.ts`).
- Stripped Edit/Delete/Clear/Print modals from `TripDetailView` (~300 lines removed).
- Stripped Print/Edit/Clear action buttons from `TripSidebar` — kept navigation, Logs, Calendar, Import.
- Moved modals (Edit, Delete, Clear, Print) into `DashboardView`.
- Files: `DashboardView.tsx`, `TripCard.tsx`, `TripCardMenu.tsx` (new), `TripDetailView.tsx`, `TripSidebar.tsx`, `route.ts`, `clear/route.ts`, `page.tsx`

### HELM-48 — Trip detail loads too slowly (closed)
- Added `loading.tsx` skeleton for instant visual feedback.
- Wrapped non-Overview sections in Suspense for streaming.
- Passed pre-computed `sectionCounts` to OverviewSection to eliminate 5 duplicate queries.
- Lazy tab mounting via `visitedTabs` Set — only mounts tabs once visited.

### HELM-53 — Calendar sync hangs (closed)
- Added `res.ok` guard before reading SSE stream.
- Server pre-counts dirty records, sends current/total progress.

### Infrastructure
- Created shared AGENTS.md pattern across Helm/Orb projects.
- Created HANDOFF.md for living session context.
- Established preference: work on main branch directly, not worktrees (for solo dev workflow).

---

## Key Decisions

- **Dashboard is CRUD hub**: All trip management (create, edit, delete, archive, clear, print, status change) happens on the dashboard. Trip detail view is read-only + import + calendar.
- **Auth shell variant system**: Variant A (navy + stars + wheel) is default. Variant B (clean header band) preserved in codebase via DEV panel toggle.
- **Service worker**: network-first for navigation. Eliminates hydration errors from stale cached HTML.
- **Dev bypass**: two layers — server-side `BYPASS_AUTH_USER_ID` and login form `dev@dev.local` match. Both disappear in production.
- **Worktrees**: Don't use for Helm. Work on main directly for live dev server testing.

---

## Next Priorities

- Test dashboard CRUD in browser (edit, delete, archive, clear, print, status change all need visual verification).
- Check Orb backlog (`product=HELM`) for new tickets.

---

## AI Tool Used Last Session

2026-05-15 — Claude Code (Opus 4.6)
