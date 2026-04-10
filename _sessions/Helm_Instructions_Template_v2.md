# Helm Instructions Template

This template defines the two instruction documents produced for each approved build step within a session:

- one for **AI2** (implementation)
- one for **Stan** (SQL, git, deploy, verification)

A single session may contain **multiple tasks** (for example, multiple sections receiving full CRUD implementations). For each **significant task or batch of changes**, AI1 may produce a pair of instruction documents following this template.

If anything in an instructions document conflicts with the **Helm Master Handoff Template**, the master handoff wins unless Stan explicitly overrides it.

---

## Secrets and environment variables

`.env.local` may contain secrets such as `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, and other credentials.

These secrets must **never** be copied into any handoff, session document, AI instruction document, Stan instruction document, chat transcript, or report-back.

Safe rule:

- Refer to secrets only by **variable name**, never by value.
- It is acceptable to instruct AI2 or Stan to **use** `SUPABASE_SECRET_KEY` or to confirm that a script reads `SUPABASE_SECRET_KEY`.
- It is **not** acceptable to paste the contents of `.env.local` or expose any secret values.

If a script needs environment variables, instructions should say things like:

- "Read `SUPABASE_SECRET_KEY` from `.env.local`"
- "Confirm required env vars are present"

They should **not** say:

- "Paste your `.env.local` here"
- "Provide the value of `SUPABASE_SECRET_KEY`"
- "Show the contents of `.env.local`"

If AI2 has access to the local repo, it may rely on `.env.local` existing, but it should not echo secret values back in its response.

---

## 1) AI2 Implementation Instructions

**Filename pattern**: `Helm_Instructions_[Mon][DD][letter]_AI.md`

One file can cover a single task or a tightly related batch of tasks, as long as the scope is clear.

### Header

- Session: `[link to session handoff filename]`
- Task label: `[e.g. Packing CRUD, Key Info refactor, multi-section CAN26 port]`
- Scope: `[short description of what this instruction set covers]`

### Constraints

This document **must**:

- Focus on code and non-SQL changes only.
- Be precise about file paths and patterns (respecting project invariants).
- Include an explicit AI2 self-check list.
- Refer to environment variables only by **name**, never by value.

This document **must not**:

- Contain SQL statements.
- Contain git commands.
- Contain Vercel or deployment steps.
- Contain secret values from `.env.local`.

### Structure

1. **Objective**
  - One or two sentences describing what AI2 will implement.
2. **Files to create or modify**
  - `path/to/file.tsx` — `[create/modify]`, `[short note of purpose]`
  - Repeat for all files.
3. **Implementation details**
  - Step-by-step instructions grouped by area, e.g.:
    - Components
    - API routes
    - Types/interfaces
    - Utility changes
  - Each step should reference the relevant project invariants (gold standard pattern, API pattern, export pattern, env vars) when applicable.
  - If env vars are needed, reference variable names only.
4. **Version bump**
  - From: `[current version]`
  - To: `[expected new version after this change set is deployed]`
5. **AI2 self-check for this task**
  AI2 must explicitly perform and report these checks:
  - Components: named exports confirmed where required.
  - Tabs/navigation: new sections wired into the UI if relevant.
  - API routes: inline helpers, correct params type, ownership checks, soft delete, correct JSON response.
  - Env vars: `SUPABASE_SECRET_KEY` used where needed by name only.
  - No SQL included in this AI2 document.
  - No secret values exposed in report-back.
  - Version bump applied as specified.
  - Search for and update any stale references (e.g. renamed/dropped tables or fields).
6. **Expected outcome**
  - Brief bullet list of what should be true after successful implementation (e.g. "Packing CRUD works end-to-end", "Key Info groups editable", etc.).

---

## 2) Stan Execution Instructions

**Filename pattern**: `Helm_Instructions_[Mon][DD][letter]_Stan.md`

This document is for Stan only. AI2 should not receive this file.

### Header

- Session: `[link to session handoff filename]`
- Task label: `[same label as AI2 doc for this task]`
- Scope: `[short description aligned with AI2 doc]`

### Structure

1. **SQL**
  - All required SQL statements, grouped logically.
  - Each group should include a short description and any verification queries.
2. **Seed scripts (if applicable)**
  - Commands to run, e.g. `node seed-[section].js <trip_uuid>`.
  - Expected effects (e.g. number of rows seeded).
  - If a script depends on env vars, reference only variable names, never values.
3. **Version bump**
  - File: `lib/version.ts`
  - From: `[current version]`
  - To: `[new version]`
4. **Git steps**
  - `git status` (check for expected changed files).
  - `git diff` (review key changes as needed).
  - `git commit` message suggestion.
  - `git push`.
5. **Deployment / environment notes**
  - Where to expect the change (Vercel, localhost, or both).
  - Any environment variables that must be present or adjusted, referenced by name only.
6. **Verification checklist (Stan)**
  - Concrete UI and behavior checks Stan should perform.
  - Any edge cases or regression checks specific to this task.
7. **Notes for next session**
  - Any observations or issues Stan wants AI1 to see in the next handoff.