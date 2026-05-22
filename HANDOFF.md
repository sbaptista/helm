# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0031`
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

**2026-05-21 — HELM-52: Version update system + hydration fix + SW dev guard**

1. **Fixed hydration mismatch (v00.02.0027)** — `VERSION` constant inlined in `use client` components caused server/client divergence during deploy skew. Created `HelmVersionLabel` with deferred render pattern (empty useState, set in useEffect). Applied to all 7 locations: DashboardView, TripDetailView, AuthShell (variants A+B), OfflinePage, FatalErrorPage, import review page.

2. **Version update system (HELM-52, v00.02.0031)** — Ported from Orb's proven pattern:
   - `lib/changelog.ts` — Release interface + CHANGELOG array seeded with v0031, v0027, v0026
   - `app/api/version/route.ts` — Returns `{ version }` with no-cache headers
   - `components/ui/UpdateBanner.tsx` — Gold banner fixed at viewport top (z-index 110). Polls on mount, visibilitychange, 5-min interval. Toast on first detection. `onVisibilityChange` callback offsets parent headers. Dev simulation via localStorage flag.
   - `components/ui/WhatsNewSheet.tsx` — Timeline changelog in ResponsiveSheet
   - Help button added to DashboardView header (left of Sign Out) — opens What's New sheet
   - `DevDebugPanel` — added "Simulate Update" toggle
   - `Toast.tsx` — moved container from bottom to top of viewport with downward slide-in

3. **Service worker dev guard** — SW was caching `_next/static/` chunks in dev, causing stale assets across restarts. `ServiceWorkerKiller.tsx` now unregisters all SWs in development, registers normally in production. Cache names bumped to v5.

4. **Knowledge repo entries** — wrote entries for both the hydration fix and the full version update system.

---

## Uncommitted Changes

### Modified
- `AGENTS.md` — synced sections from Orb
- `HANDOFF.md` — this file
- `app/api/trips/[id]/itinerary/days/route.ts` — server-side validation for day_date + title
- `components/advisor/DashboardView.tsx` — HelmVersionLabel, UpdateBanner with offset, Help button, WhatsNewSheet
- `components/advisor/TripDetailView.tsx` — HelmVersionLabel, UpdateBanner
- `components/auth/AuthShell.tsx` — HelmVersionLabel for both variants
- `components/sections/ChecklistClient.tsx` — scroll-to-error + toast
- `components/sections/FlightsClient.tsx` — scroll-to-error + toast + inline timing errors
- `components/sections/HotelsClient.tsx` — scroll-to-error + toast
- `components/sections/ItineraryClient.tsx` — client-side day/row validation + scroll-to-error + toast
- `components/sections/RestaurantsClient.tsx` — scroll-to-error + toast
- `components/sections/TransportationClient.tsx` — scroll-to-error + toast
- `components/ui/DevDebugPanel.tsx` — "Simulate Update" toggle
- `components/ui/FatalErrorPage.tsx` — HelmVersionLabel
- `components/ui/OfflinePage.tsx` — HelmVersionLabel
- `components/ui/ServiceWorkerKiller.tsx` — dev guard (unregister in dev, register in prod)
- `components/ui/Toast.tsx` — top-positioned container with downward slide-in
- `lib/version.ts` — bumped to 00.02.0031
- `public/sw.js` — cache names v4 → v5
- `app/advisor/trips/[id]/import/review/page.tsx` — HelmVersionLabel

### New
- `app/api/version/route.ts` — version endpoint
- `components/ui/HelmVersionLabel.tsx` — deferred version render
- `components/ui/UpdateBanner.tsx` — version detection + update banner
- `components/ui/WhatsNewSheet.tsx` — changelog timeline in ResponsiveSheet
- `lib/changelog.ts` — release changelog data
- `lib/form-utils.ts` — shared scrollToFirstError() utility

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

1. Check Orb backlog (`product=HELM`) for new tickets.
2. Address any remaining hydration issues if they resurface after the SW dev guard fix.

---

## AI Tool Used Last Session

2026-05-21 — Claude Code (Opus 4.6)
