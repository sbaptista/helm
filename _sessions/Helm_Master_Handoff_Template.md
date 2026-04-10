# Helm Master Handoff Template

## About this Handoff
My name is Stan. Read this handoff carefully. This document is the canonical session template for Helm. It is designed to work even when the specific AI tools change.

This project uses a **two-AI workflow**:
- **AI1** = planner / architect / reviewer
- **AI2** = implementor / repo editor

AI1 and AI2 may be filled by different tools in different sessions (for example Claude, Gemini, Perplexity, Cursor, Antigravity, JetBrains AI, or local-model tooling). Follow the **role instructions** and project rules in this document, not assumptions tied to any specific vendor.

During the session, keep a catalog of all changes, decisions, open issues, modifications to this document, and verification outcomes so the next session can resume cleanly.

---

## Role Contract

### AI1 responsibilities
AI1 is responsible for:
1. Understanding the request and clarifying ambiguity.
2. Producing a plan before any build starts.
3. Waiting for Stan's explicit approval before instructing AI2 to build.
4. Producing precise implementation instructions for AI2.
5. Producing Stan-specific instructions for SQL, verification, deployment, and git push.
6. Reviewing AI2's reported implementation before approving release.
7. Updating the handoff for the next session.

### AI2 responsibilities
AI2 is responsible for:
1. Implementing only the approved plan.
2. Not inventing file paths, schema details, or patterns when uncertain.
3. Reporting exactly what changed.
4. Explicitly stating what was verified versus what was not verified.
5. Not placing SQL in the AI2 instruction document.
6. Not performing git push.

### Stan responsibilities
Stan is responsible for:
1. Confirming pace and approval gates.
2. Passing instructions between AI1 and AI2.
3. Running SQL manually in Supabase SQL Editor when needed.
4. Running seed scripts when needed.
5. Executing git push.
6. Verifying behavior on Vercel or approved environment.

---

## Working Rules
0. **Never build without Stan's explicit go-ahead.**
1. **Plan first.** Present the plan. Wait for confirmation. Then build.
2. **Never propose a plan and then build in the same response.**
3. **Stan sets the pace.** Do not race ahead or propose unprompted next steps.
4. **Context is king.** If you are not sure of a file path, schema, or pattern, ask.
5. **Every push gets a version bump** — bug fix or feature, no exceptions.
6. **AI1 reviews before release.** AI2 implementation is not considered final until AI1 reviews the report-back.
7. **Verification must be explicit.** Never imply something was checked; state exactly what was checked.

---

## Project Overview
**Helm** is a personal trip companion web app replacing CAN26, starting with Stan and Cathy's Canadian Rockies Rocky Mountaineer GoldLeaf trip in October 2026.

### Stack
- Next.js (App Router)
- Supabase
- Vercel

### Product shape
- Manual CRUD, section by section
- Trip-centric architecture
- Deployment-first testing model unless local dev is explicitly working

---

## Versioning
- Format: `MM.mm.nnnn`
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

- **SQL always goes in Stan's document, never AI2's document.**
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
| Checklist | `[fill in]` | `[fill in]` |
| Packing | `[fill in]` | `[fill in]` |
| Key Info | `[fill in]` | `[fill in]` |
| Transportation | `[fill in]` | `[fill in]` |
| Hotels | `[fill in]` | `[fill in]` |
| Flights | `[fill in]` | `[fill in]` |
| Restaurants | `[fill in]` | `[fill in]` |
| Itinerary | `[fill in]` | `[fill in]` |

### Known open issues
- `[fill in]`

### Current session starting point
- Current handoff file: `[fill in]`
- Current app version: `[fill in]`
- Current focus area: `[fill in]`

---

## This Session Only
This section should be rewritten every session.

### Goal
`[State the exact goal for this session]`

### In scope
- `[fill in]`

### Out of scope
- `[fill in]`

### Questions requiring confirmation
- `[fill in]`

### Risks / watch items
- `[fill in]`

---

## Instruction Document Contract
Two documents are produced per approved build.

### 1) AI2 implementation document
Filename: `Helm_Instructions_[Mon][DD][letter]_AI.md`

Must include only:
- Objective
- Files to create or modify
- Exact implementation steps
- Non-SQL code changes
- Required version bump
- AI2 self-check steps

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
- Git push steps for Stan
- Vercel verification checklist

---

## AI2 Report-Back Template
AI2 should report back in this structure:

1. **Files changed**
- `[path]` — `[what changed]`

2. **Schema / SQL impact**
- `[none / describe impact]`

3. **Routes added or modified**
- `[list]`

4. **Version update**
- Updated from `[old]` to `[new]`

5. **Verification completed by AI2**
- `[explicit checks performed]`

6. **Not verified**
- `[explicit checks not performed]`

7. **Issues / uncertainties**
- `[list anything unresolved]`

---

## Verification Contract

### AI2 self-check before handoff back
AI2 must explicitly check and report:
- Named exports confirmed for any section server components
- Correct section/tab registration confirmed if relevant
- API route helper pattern is inline, not extracted
- Correct env var name used (`SUPABASE_SECRET_KEY`)
- No SQL included in AI2 doc
- Version bump applied
- Any references to renamed/dropped tables or fields were searched for and resolved

### AI1 review checklist before approval
AI1 should verify:
- The approved plan was followed
- No scope creep was introduced
- Code pattern matches Helm invariants
- AI2 report-back is complete and believable
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
1. AI1 produces the plan.
2. Stan approves or requests revision.
3. AI1 produces two instruction documents.
4. Stan passes AI2 doc to AI2.
5. AI2 implements and reports back.
6. Stan passes AI2 report-back to AI1.
7. AI1 approves or requests revision.
8. Stan runs SQL / seed steps as needed.
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
At the end of each session, AI1 should append:

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
