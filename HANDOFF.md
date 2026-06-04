# HANDOFF.md

> Living session-to-session context for the Helm project.
> Every AI reads this at session start. Every AI updates it at session end.
> Committed with each session's code changes.

## App State

- **Version:** `00.02.0035`
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
| Auth (OTP) | Complete — 6-digit code flow + Passkeys | 00.02.0034 |
| Auth Shell | Redesigned — single-column, ship's wheel, shooting stars | 00.02.0019 |
| Icons | Ship's wheel favicon (32x32) + PWA icon (180x180) | 00.02.0018 |
| Dashboard | CRUD centralized — ellipsis menu, status pills, force-dynamic + Help button + update banner | 00.02.0031 |
| Version System | Update banner + What's New sheet + changelog + /api/version | 00.02.0031 |

---

## Last Session Completed

**2026-06-03 — Global Offline Guard & Passkey/6-Digit OTP Integration (Session 51, Gemini 3.5 Flash)**

1. **Global Offline Guard (HELM-54)** — Wired `OfflineGuard` directly into the root layout `layout.tsx` to automatically cover all pages (including unauthenticated pages like `/auth/login` and `/auth/verify-otp`). Removed duplicate overrides from dashboard, print, search, and import review pages.
2. **WebAuthn/Passkey Utilities (HELM-59)** — Ported client-side passkey enrollment, listing, deletion, and authentication utilities (`lib/passkey.ts`). Excluded localhost/dev domains from passkey availability logic to avoid WebAuthn RP ID mismatch issues.
3. **Passkey Onboarding Route (HELM-59)** — Built server page `app/auth/setup-passkey/page.tsx` and client form `SetupPasskeyForm.tsx` to register biometrics immediately after login.
4. **Login UI Integrations (HELM-59)** — Added a "Sign in with passkey" option on the login form when biometrics are supported, and removed the visual development bypass instructions box from the login page UI.
5. **6-Digit OTP Migration (HELM-59)** — Converted the OTP verification screen and input constraints from 8 digits to 6 digits to match standard Supabase/Orb behavior, adding redirection to setup-passkey for first-time passkey enrollment.

---

## Uncommitted Changes

### Modified
- `app/layout.tsx` — integrated global OfflineGuard wrapping RootLayout children
- `app/advisor/dashboard/page.tsx` — removed redundant OfflineGuard wrapper
- `app/advisor/trips/[id]/import/review/page.tsx` — removed redundant OfflineGuard wrapper
- `app/advisor/trips/[id]/print/page.tsx` — removed redundant OfflineGuard wrapper
- `app/search/page.tsx` — removed redundant OfflineGuard wrapper
- `app/auth/login/LoginForm.tsx` — integrated conditional passkey login option and removed bypass banner UI
- `app/auth/verify-otp/VerifyOtpForm.tsx` — changed to 6 digits and added passkey onboarding redirect
- `lib/version.ts` — bumped version to 00.02.0035
- `package.json` — bumped dependencies (@supabase/supabase-js to 2.106.2, @supabase/ssr to 0.10.3) and version to 0.2.35
- `lib/changelog.ts` — added release entries for v00.02.0034 and v00.02.0035
- `package-lock.json` — updated package structures
- `HANDOFF.md` — this file

### New Files
- `lib/passkey.ts` — WebAuthn utility script
- `app/auth/setup-passkey/page.tsx` — passkey onboarding page
- `app/auth/setup-passkey/SetupPasskeyForm.tsx` — passkey onboarding client form

### Untracked
- `supabase/` — local supabase configuration directory (committed config.toml in last session)

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
