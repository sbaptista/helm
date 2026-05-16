## Comprehension Check — Answer all questions below verbatim before any other response:

1. Return the exact `VERSION` string from `/Users/stanleybaptista/Projects/helm/lib/version.ts`. If you are running in a worktree or isolated environment, also report your local version and note any difference.
2. What port does the dev server run on?
3. What is the version format and where is it stored?
4. What are the working rules? (Read the shared file first.)
5. What is the most important rule?
6. Where are resolution notes written and what else must be created when closing a todo?
7. Run git status and report whether there are any uncommitted changes.
8. What AI Role are you?

**Instructions:**
- Your first and only message before any tool use must be a numbered list answering all questions.
- After answering, read `HANDOFF.md` before using any tools or continuing.
- Do not summarize. Do not say "ready." Do not ask "what do you need?" Answer every question directly.
- If you cannot answer all accurately, do not proceed — say exactly which you're uncertain of.
- When providing git commands or terminal scripts to the user, ALWAYS concatenate them with `&&` rather than listing them on separate lines.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Shared Configuration

The following file contains cross-project rules, conventions, and shared resource access (Orb API, Knowledge Repo, AI roles, git conventions). Read it before proceeding.

**@/Users/stanleybaptista/Projects/shared/AGENTS.md**

---

# Project

**Helm** — personal trip companion web app (Next.js App Router, Supabase, Vercel, TypeScript, Tailwind v4).
Replacing CAN26 for October 2026 Canadian Rockies / Rocky Mountaineer trip.

**GitHub:** `sbaptista/helm`
**Live:** `helm-gilt.vercel.app`
**Product code:** `HELM` (for Orb API and Knowledge Repo)
**Dev port:** 3000
**Supabase client import path:** `@/lib/supabase/client`

---

# Versioning

**Version file:** `lib/version.ts` — format `MM.mm.nnnn` (major.minor.patch)
**Bump protocol:** AI only bumps the patch (fourth node, e.g. `00.02.0019` → `00.02.0020`). Stan explicitly indicates when to bump minor or major.

Version bumps happen on every local change — no exceptions. The dev server always shows the current local version so Stan can confirm changes loaded.

---

# Session Workflow

## At session start

1. **Read both files:**
   - This file (`AGENTS.md`) → understand the system and shared conventions
   - `HANDOFF.md` → understand current state
2. **Answer the comprehension check** (top of this file)
3. **Declare role:** `"Acting as AI1+AI2 (both roles)"`
4. **Optional: Fetch live backlog** (see shared AGENTS.md for curl command, use `product=HELM`)

## During session (when requested or at session end)

When Stan asks "update the handoff" OR at natural session end:

1. **Update `HANDOFF.md`** with:
   - Current version (if bumped)
   - Section status changes
   - "Last Session Completed" — what was done this session (replaces prior)
   - "Next Priorities"
   - "AI Tool Used Last Session" (`YYYY-MM-DD — Tool (model)`)

2. **Wait for Stan to commit** — do not auto-commit

3. **Do not narrate** the update — just do it silently

## Working Directory

The source of truth is always `/Users/stanleybaptista/Projects/helm/` (the **main directory**). All AI tools must read and write files there.

- **Worktree-based tools** (Claude Code Desktop) run in an isolated copy (`.claude/worktrees/<name>`). Before asking Stan to test, patch main:
  ```bash
  git diff > /tmp/helm-patch.patch && git -C /Users/stanleybaptista/Projects/helm apply /tmp/helm-patch.patch
  ```

---

# Handoff File Conventions

The handoff is `/Users/stanleybaptista/Projects/helm/HANDOFF.md` — a single living file in the repo root, committed with each session's code changes.

It contains:
- Current version
- Section status table
- Last session completed work
- Key decisions (if applicable)
- Next priorities
- AI tool used last session

The version is also tracked in HANDOFF.md for quick reference, but `lib/version.ts` is always canonical.

---

# Key Technical Notes

### Layout constants
- DashboardBar height: `40px`, `position: sticky`, `top: 0`, `z-index: 31`
- TripTopBar min-height: `64px`, `position: sticky`, `top: 40px`, `z-index: 30`
- TripSidebar: `position: fixed`, `height: 100dvh`, `z-index: 50`
- Overlay: `z-index: 40`

### gcal_include checkbox (standardised 00.02.0002)
- All 6 sections: `width: 20px; height: 20px; accentColor: 'var(--gold)'`
- Disabled when date field is empty

### Known gotchas
- **params pattern**: all route handlers use `params: Promise<{ id: string }>` with `await params`
- **Checklist field**: task field is named `task`, not `title`
- **Checklist completed state**: field is `status: string`, value `'completed'` — not a boolean
- **Restaurants type constraint**: `restaurants_type_check` allows only `'included'` and `'independent'`
- **logger.ts**: server-side only — never import in client components. Client-side logging goes via `POST /api/logs`.
- **Logs policy**: `helm_logs` is for unexpected errors (try/catch) only. Never log business conditions as WARN — those belong to the WARN system.
- **Supabase publishable key**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **File paths**: ChecklistClient and KeyInfoClient at `components/sections/`. Only OverviewClient under `components/trips/overview/`
- **Sidebar fixed footer**: do not attempt — known iOS failure mode
- **TripDetailView**: outer wrapper owns `useOnlineStatus` only. All other hooks live in `TripDetailViewInner`. Do not merge them back together.
- **Required field validation**: on-blur per field using `touched: Set<string>` (2+ fields) or `fieldTouched: boolean` (1 field). Never show red borders on untouched forms.
- **Hook declaration order**: computed values that reference state variables must be declared AFTER those `useState` calls — React TDZ will crash at runtime if not.
- **Service worker**: `public/sw.js` registers via `ServiceWorkerRegistrar` in `layout.tsx`. Cache names are versioned — bump `helm-shell-vN` and `helm-assets-vN` in `sw.js` when deploying changes that require cache busting. Navigation uses **network-first** strategy (not stale-while-revalidate).
- **OfflineGuard**: `components/ui/OfflineGuard.tsx` — wraps pages that need offline protection.
- **.env.local**: stored outside the project directory, symlinked in.
- **Auth: page-level `'use client'` + AuthShell** — causes hydration errors. Always split into server `page.tsx` + client `*Form.tsx` for auth pages.
- **DevDebugPanel**: scrollable (`maxHeight: 70vh`). Auth variant toggle stores in `localStorage`. Never read `localStorage` in `useState` initializer — use `useEffect` to avoid hydration mismatch.

### Trip ID
`0e1d98a3-a124-42e1-b68d-498bb60f46be`
