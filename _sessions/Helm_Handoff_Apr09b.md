# Helm Master Handoff Template

## About this Handoff
My name is Stan. Read this handoff carefully. This document is the canonical session template for Helm. It is designed to work even when the specific AI tools change — follow the role instructions and project rules here, not assumptions tied to any specific vendor.

This project uses a **two-role AI workflow**: AI1 (planner/architect/reviewer) and AI2 (implementor). These roles may be filled by two different tools, or by one tool playing both. The session assignment block below declares which configuration is active.

---

## Session Role Assignment
**This block must be filled in at the start of every session.**

| Role | Assigned To |
|---|---|
| **AI1 — Planner / Architect / Reviewer** | `Claude` |
| **AI2 — Implementor** | `[Same as AI1` |
| **Stan — Approval** | Stan |
| **Stan — Execution** | Stan (SQL, git push, verification — always) |

**Single-AI mode:** AI1 and AI2 are the same tool. It plays both roles in sequence — plan first, then implement — with Stan's approval gate in between. Because there is no IDE agent, Stan applies all file changes using the add-or-replace discipline (see below). Stan also runs SQL, git push, and verification.

**Two-AI mode:** AI1 and AI2 are different tools. AI2 is always an IDE agent (e.g. Cursor) with direct repo access — it makes file changes however it needs to. AI1 produces the plan and a precise implementation spec; Stan passes it to AI2. AI2 implements and reports back. Stan passes the report-back to AI1 for review. Stan still runs SQL, git push, and verification.

---

## Role Contract

### AI1 — Planner / Architect / Reviewer
1. Understanding the request and clarifying ambiguity before any plan is formed.
2. Producing a plan before any build starts. Waiting for Stan's explicit approval.
3. Never proposing a plan and starting to build in the same response.
4. Producing a precise implementation spec for AI2 — exactly what to build, which files to touch, what patterns to follow, what constraints apply, and what is explicitly out of scope. AI1 does not leave implementation details to AI2's judgment.
5. In single-AI mode: switching into the AI2 role after Stan's approval, then producing complete file outputs for Stan to apply.
6. Producing Stan-specific instructions for SQL, verification, deployment, and git push.
7. Reviewing AI2's report-back before approving release.
8. Updating the handoff for the next session.

### AI2 — Implementor
AI2 is always an IDE agent (e.g. Cursor) in two-AI mode. It has direct repo access and makes file changes however it needs to. Specifically:
1. Implementing only the approved plan as specified by AI1.
2. Not inventing file paths, schema details, or patterns — follow the spec. Ask AI1 if anything is unclear before proceeding.
3. Reporting exactly what changed.
4. Explicitly stating what was verified versus what was not verified.
5. Not placing SQL in the implementation document.
6. Not performing git push.

*In single-AI mode, the same tool fulfills both AI1 and AI2 responsibilities in sequence, with Stan's approval gate between them. Stan handles all file changes.*

### Stan — Approval
Stan is the sole decision-maker at every gate:
1. Approving or rejecting every plan before build starts.
2. Approving or rejecting every implementation before release.
3. Setting pace, scope, and priority at all times.

### Stan — Execution
Stan always handles:
1. Running SQL manually in Supabase SQL Editor.
2. Running seed scripts when needed.
3. Executing git push.
4. Verifying behavior on Vercel or approved environment.

In single-AI mode, Stan also handles all file changes using the add-or-replace discipline (see below).

---

## Add-or-Replace Execution Discipline
**Applies in single-AI mode only, when Stan is applying file changes manually.**

- Every file change resolves to one of two operations: **add a new file** or **replace an existing file with complete new content**.
- When replacing: delete the existing file first, then add the replacement. Never hand-edit partial sections of a file.
- AI1 (acting as AI2) must produce the complete file — not a diff, not a fragment.
- AI1 must include a brief "what changed in this file" note alongside every file output so Stan can verify before applying.
- Before replacing, confirm the file path. If the file has local changes to preserve, flag this before proceeding.
- Standalone file deletions (with no replacement) require explicit approval as a named step — they do not happen implicitly.

---

## Working Rules
0. **Never build without Stan's explicit go-ahead.**
1. **Plan first.** Present the plan. Wait for confirmation. Then build.
2. **Never propose a plan and then build in the same response.**
3. **Stan sets the pace.** Do not race ahead or propose unprompted next steps.
4. **Context is king.** If you are not sure of a file path, schema, or pattern, ask.
5. **Every push gets a version bump** — bug fix or feature, no exceptions.
6. **AI1 reviews before release.** Implementation is not considered final until the AI1 reviews the report-back.
7. **Verification must be explicit.** Never imply something was checked; state exactly what was checked.

---

## Project Overview
**Helm** is a personal trip companion web app replacing CAN26, starting with Stan and Cathy's Canadian Rockies Rocky Mountaineer GoldLeaf trip in October 2026.

### Stack
- Next.js (App Router)
- Supabase
- Vercel
- TypeScript
- Tailwind v4

### Product shape
- Manual CRUD, section by section
- Trip-centric architecture
- Deployment-first testing model unless local dev is explicitly working

---

## Versioning
- Format: `v00.01.0058`
- Defined in `lib/version.ts` as `VERSION` constant
- **Bump with every Git push — no exceptions, including bug fixes**
- Testing is typically done on Vercel unless local development is explicitly functioning
- **Current version:** `[fill in current version]`

---

## Handoff Naming
- Session handoff format: `Helm_Handoff_[Mon][DD][letter].md`
- AI instruction format: `Helm_Instructions_[Mon][DD][letter]_AI.md`
- Stan instruction format: `Helm_Instructions_[Mon][DD][letter]_Stan.md`

---

## Critical Never-Forget Rules
These are high-risk items that must be checked every time:

- **SQL always goes in Stan's document, never the AI implementation document.**
- **Section server components use named exports, not default exports.**
- **Service role env var is `SUPABASE_SECRET_KEY`, not `SUPABASE_SERVICE_ROLE_KEY`.**
- **API routes define `serviceClient()` and `getAuthUserId()` inline; there is no shared helper file for these.**
- **DELETE uses soft delete and returns `NextResponse.json({ success: true })`.**
- **`params` is `Promise<{ id: string }>` and must be awaited in route handlers.**
- **Every push gets a version bump.**
- **No build without explicit approval.**

---

## Project Invariants
These rules persist across sessions unless explicitly changed.

### Gold Standard Pattern
Reference implementation: `TransportationClient.tsx`

All CRUD sections follow this pattern exactly:
- `components/sections/[Section]Client.tsx` — client component with BottomSheet, form state, save/delete logic
- `components/sections/[Section]Section.tsx` — thin async server wrapper, fetches initial data, renders Client
- `app/api/trips/[id]/[section]/route.ts` — GET + POST
- `app/api/[section]/[id]/route.ts` — PATCH + DELETE

### API Route Pattern
- Inline `serviceClient()` and `getAuthUserId()` helpers at top of each route file
- `params` is always `Promise<{ id: string }>` and must be awaited
- POST and PATCH/DELETE include `trip_members` ownership check
- GET does not require auth check
- DELETE is soft delete via `deleted_at`
- DELETE returns `NextResponse.json({ success: true })`

### Export Pattern
- Section server components use **named exports**
- Import style example: `import { PackingSection } from '@/components/sections/PackingSection'`
- Using `export default` for section server components can cause Vercel build failure

### Env Var Pattern
- Service role key env var is `SUPABASE_SECRET_KEY`
- New scripts and utilities must use `SUPABASE_SECRET_KEY`

### Seed Script Pattern
- No `dotenv` dependency
- Read `.env.local` manually via `fs`
- Accept `trip_id` as CLI argument: `node seed-[section].js <trip_uuid>`
- Exit clearly if env vars or `trip_id` are missing

### Known Global CSS Pattern
- `globals.css` scopes appearance reset to `input:not([type="checkbox"])` to preserve native checkbox rendering

### Established UI Pattern
- Long text list values may use `.line-clamp-3` when appropriate

---

## Current Product State

### Section status
| Section | Status | Version |
|---|---|---|
| Checklist | ✅ Functional (Gold Standard) | `00.01.0050` |
| Packing | ✅ Functional | `00.01.0050` |
| Key Info | ✅ Functional (Gold Standard CRUD) | `00.01.0054` |
| Transportation | ✅ Functional (Standardized) | `00.01.0056` |
| Hotels | ✅ Functional | `00.01.0056` |
| Flights | ✅ Functional | `00.01.0056` |
| Restaurants | ✅ Functional | `00.01.0056` |
| Itinerary | ✅ Functional | `00.01.0056` |
| Printing | ✅ Functional (3x5 Expanded) | `00.01.0057` |

### Known open issues
- **Physical Alignment**: Awaiting results of Epson 3x5 print tests from Stan (using version 00.01.0058). We are experiencing similar issue to CAN26 with 3x5 magins. They are too small on the left and right.
- **UI Logic**: Long text descriptions may need `.line-clamp-3` for better layout density. Some of this is already done. Check that it applies everyehere applicable.

### Current session starting point
- Current handoff file: `Helm_Handoff_Apr09b.md`
- Current app version: `00.01.0058`
- Current focus area: **UI Density & Verification**

---

## This Session Only
This section should be rewritten every session.

### Goal
Recalibrate 3x5 Reference Card margins and investigate global UI density pass.

### In scope
- [x] Initial recalibration of 3x5 card margins (00.01.0058).
- [x] Address alignment feedback (after Stan test).
- [x] Global UI density pass (`.line-clamp-3`).

### Out of scope
- Infrastructure changes.
- Large-scale refactoring of stable sections.

### Questions requiring confirmation
- `none`

### Risks / watch items
- `none`

## Change Log / Lessons Learned

| # | Date / Session | Note |
|---|---|---|
| 1 | Apr 08a/b | Completed 3x5 Reference Card expansion (Transportation/Restaurants). |
| 2 | Apr 09a | Recalibrated 3x5 margins using inch-based padding to resolve Epson hardware clipping. |

## TODOs for this Session
- [x] Receive hardware test feedback from Stan.
- [x] Implement `.line-clamp-3` in areas not currently implemented.
---

## Instruction Document Contract
Two documents are produced per approved build.

### 1) AI2 / Agent implementation document
Filename: `Helm_Instructions_[Mon][DD][letter]_AI.md`

In **two-AI mode**, this document is a precise implementation spec for the IDE agent: exactly which files to create or modify, what logic to implement, which patterns to follow, and what constraints apply. AI1 does not leave details open for AI2 to decide.

In **single-AI mode**, this document contains complete file outputs (not diffs or fragments) with a "what changed" note per file, ready for Stan to apply via add-or-replace.

Must include:
- Objective
- Files to create or modify, with exact implementation detail
- What is explicitly out of scope
- Non-SQL code changes
- Required version bump
- Self-check / verification steps

Must not include:
- SQL blocks
- Git push steps
- Vercel deployment instructions for Stan

### 2) Stan execution document
Filename: `Helm_Instructions_[Mon][DD][letter]_Stan.md`

Must include:
- All SQL blocks
- Verification queries
- Seed script commands if needed
- Version bump expectation
- Git push steps
- Vercel verification checklist
- In single-AI mode: explicit ordered list of files to add or replace, with confirmation checkpoint per file

---

## Report-Back Template
After implementation, AI2 (or Stan in manual mode) should report back in this structure:

1. **Files changed**
   - `[path]` — `[what changed]`

2. **Schema / SQL impact**
   - `[none / describe impact]`

3. **Routes added or modified**
   - `[list]`

4. **Version update**
   - Updated from `[old]` to `[new]`

5. **Verification completed**
   - `[explicit checks performed]`

6. **Not verified**
   - `[explicit checks not performed]`

7. **Issues / uncertainties**
   - `[list anything unresolved]`

---

## Verification Contract

### Implementor self-check before handoff back
Whether AI2 is an IDE agent or Stan in manual mode, these must be explicitly checked and reported:
- Named exports confirmed for any section server components
- Correct section/tab registration confirmed if relevant
- API route helper pattern is inline, not extracted
- Correct env var name used (`SUPABASE_SECRET_KEY`)
- No SQL included in implementation document
- Version bump applied
- Any references to renamed/dropped tables or fields were searched for and resolved

### AI1 review checklist before approval
- The approved plan was followed
- No scope creep was introduced
- Code pattern matches Helm invariants
- Report-back is complete and believable
- Any SQL is in Stan's document only
- Deployment/verification steps are sufficient

### Stan manual verification checklist
Stan should verify as applicable:
- SQL ran successfully
- Verification queries returned expected results
- Seed script completed successfully
- App deployed
- Relevant UI section appears and is reachable
- CRUD behavior works
- No missing buttons / missing tabs / obvious regressions
- Version shown is correct

---

## Deployment Workflow

**Single-AI mode** (AI1 and AI2 are the same tool, Stan applies files):
1. AI1 produces the plan.
2. Stan approves or requests revision.
3. AI1 produces two instruction documents (complete file outputs + Stan doc).
4. Stan applies files via add-or-replace discipline.
5. Stan runs SQL / seed steps per Stan doc.
6. Stan executes git push.
7. Stan verifies on Vercel or approved environment.
8. Stan reports back to AI1.
9. AI1 approves or requests revision.
10. AI1 updates the handoff for the next session.

**Two-AI mode** (AI1 plans, AI2 is an IDE agent that edits repo directly):
1. AI1 produces the plan.
2. Stan approves or requests revision.
3. AI1 produces two instruction documents (AI2 spec + Stan doc).
4. Stan passes AI2 doc to IDE agent.
5. IDE agent implements and reports back.
6. Stan passes report-back to AI1.
7. AI1 approves or requests revision.
8. Stan runs SQL / seed steps per Stan doc.
9. Stan executes git push.
10. Stan verifies on Vercel or approved environment.
11. AI1 updates the handoff for the next session.

---

## Change Log / Lessons Learned
Keep a running history of important changes, decisions, mistakes, fixes, and process improvements.

| # | Date / Session | Note |
|---|---|---|
| 1 | `[fill in]` | `[fill in]` |

Use this section for durable lessons such as:
- tab registration mistakes
- Vercel build failures from wrong export style
- env var corrections
- SQL workflow decisions
- schema cleanup lessons

---

## TODOs for Next Session
- `[fill in]`

---

## Session Closeout Template
At the end of each session, the AI1 should append:

### What was completed
- `[fill in]`

### What changed
- `[fill in]`

### What remains open
- `[fill in]`

### Recommended next starting point
- `[fill in]`

### Next handoff filename
- `[fill in]`
