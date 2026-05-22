## Comprehension Check — Answer all questions below verbatim before any other response:

1. Return the exact `VERSION` string from `/Users/stanleybaptista/Projects/helm/lib/version.ts`. If you are running in a worktree or isolated environment, also report your local version and note any difference.
2. What port does the dev server run on?
3. What is the version format and where is it stored?
4. What are the working rules? (Read the shared file first.)
5. What is the most important rule?
6. Where are resolution notes written and what else must be created when closing a todo?
7. Run git status and report whether there are any uncommitted changes.
8. What AI Role are you?
9. List every file from HANDOFF.md's "Uncommitted Changes" section that you re-read. Confirm all were loaded.
10. What is the release documentation protocol for production releases? (Repeat the rule verbatim)

**Instructions:**
- **Never build/implement changes without explicit permission/confirmation from Stan.**
- **Repeat verbatim the release documentation rule at the start of every session:** Before any code push/release, the agent must document all changes in `lib/changelog.ts` by adding a new `Release` entry with the bumped version, release date, and details of changes, and bump the patch version in `lib/version.ts`.
- **Knowledge Repository Access:** The knowledgebase is stored in the database (`knowledge_repo` table). Always query it at the start of a task using the `SUPABASE_SECRET_KEY` (service role) to bypass Row Level Security (RLS) constraints. See the **Knowledge Repository Access** section below for connection details and query examples.
- Your first and only message before any tool use must be a numbered list answering all questions.
- After answering, read `HANDOFF.md`, then **re-read every file listed in the "Uncommitted Changes" section** (both modified and new) before using any tools or continuing. This prevents stale-context overwrites when multiple AI tools edit the same directory.
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

### Knowledge Repository (agents)

- **Research reads:** ALWAYS use the Service Role key (`SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` depending on the project's env naming) to query the knowledge repository.
- **RLS Warning:** Never use the publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or anonymous key). RLS rules restrict public access, meaning you will either see an empty list `[]` or only a subset of entries. If you are seeing zero or very few entries, verify you have switched to the Service Role key to bypass RLS.
- **When closing a todo:** Search `knowledge_repo` for the same topic; supersede or link — don't assume old entries are still true (shared working rule #12).

---

# Knowledge Repository Access

The Knowledge Repo stores distilled lessons, decisions, and resolution notes across all projects in the database.

- **API URL:** `https://livwkbnkdlrbmzgythys.supabase.co`
- **Key:** `SUPABASE_SECRET_KEY` (service role) located in `/Users/stanleybaptista/Projects/helm/.env.local`
- **Rule:** Bypasses RLS to guarantee complete results. Never query using the publishable/anon key.

### Query all entries:
```bash
curl -s "https://livwkbnkdlrbmzgythys.supabase.co/rest/v1/knowledge_repo?select=*,projects(code,name)&order=created_at.desc" \
  -H "apikey: $(grep SUPABASE_SECRET_KEY /Users/stanleybaptista/Projects/helm/.env.local | cut -d= -f2)" \
  -H "Authorization: Bearer $(grep SUPABASE_SECRET_KEY /Users/stanleybaptista/Projects/helm/.env.local | cut -d= -f2)"
```

### Search by topic/keyword:
```bash
curl -s "https://livwkbnkdlrbmzgythys.supabase.co/rest/v1/knowledge_repo?or=(title.ilike.*<term>*,content.ilike.*<term>*)&select=id,title,created_at,content&order=created_at.desc" \
  -H "apikey: $(grep SUPABASE_SECRET_KEY /Users/stanleybaptista/Projects/helm/.env.local | cut -d= -f2)" \
  -H "Authorization: Bearer $(grep SUPABASE_SECRET_KEY /Users/stanleybaptista/Projects/helm/.env.local | cut -d= -f2)"
```

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

---

# Multi-Platform Design

Helm targets three platforms:
- **Mac** — desktop/laptop, full viewport, keyboard + mouse/trackpad
- **iPad** — tablet, touch input, mid-sized viewport
- **iPhone** — mobile, touch input, narrow viewport

All three must provide a fully functional experience. When making design or implementation decisions, assume:

- **Ageing eyes** — text must be legible at a comfortable reading distance on all screen sizes. Avoid tiny fonts, low-contrast text, and dense layouts that require zooming.
- **Potential motor skill limitations** — interactive elements must have adequate hit targets (at least 44pt minimum per Apple HIG). Avoid interactions that require fine precision.
- **Touch-first on mobile** — hover-only interactions are unacceptable. All functionality must work via tap on iPad and iPhone.

Test design decisions across all three form factors. When in doubt, err on the side of larger, more spacious, and more forgiving layouts.

---

# Production Releases

Before any production release or code push, you must document all changes in the release documentation file.
- **File:** `/Users/stanleybaptista/Projects/helm/lib/changelog.ts`
- **Action:** Bump the patch version in `lib/version.ts`, and add a new entry to the `CHANGELOG` array in `lib/changelog.ts` with the new version string, release date, and detailed bullet points describing the changes.
- **Note:** `lib/changelog.ts` does not yet exist — see HELM-56. Until it is built, document changes in `HANDOFF.md` as usual and bump `lib/version.ts`.

---

# Known Gotchas (General)

- **Dev server**: User-started only. No AI tool can start it — always blocked. Assume it's running when Stan says it is; if you need it, ask.
- **Version:** `lib/version.ts` is canonical. Bumped on every local change — no exceptions.

---

# WIP & Multi-Agent Transition Protocol (Resilience to Usage Caps)

When working on complex tasks, an agent's usage limits may expire mid-session, leaving the workspace in an incomplete state. To prevent losing valuable context, design plans, and code drafts locked in the expired chat history, apply these mitigation strategies:

1. **Write a `WIP.md` at key milestones**:
   Immediately after aligning on a plan, designing an architecture, or completing a sub-task, write a brief `WIP.md` in the repository root detailing:
   - **Current status**: What has been implemented so far.
   - **Design decisions**: Crucial choices, API specifications, or database schema additions.
   - **Immediate next steps**: Exact instructions for the next agent to resume work.
   - Delete `WIP.md` only at the very end of the session when staging the final `HANDOFF.md` commit.

2. **Commit draft code to a local WIP branch**:
   If you have written significant uncommitted changes, you can stage and commit them to a local scratch branch (e.g., `wip/feature-name`) with a descriptive message. The incoming agent can inspect the branch diff to see exactly where you left off.

3. **Use Scratch Files for complex code drafts**:
   Save raw code drafts, research summaries, or temporary API responses in the `scripts/` or `scratch/` directory. Do not leave them only in the chat history.
