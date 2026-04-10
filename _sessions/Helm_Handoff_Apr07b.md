# Helm Handoff — Apr07b

## About this Handoff
My name is Stan. Read this handoff carefully. You will be responsible for updating it for the next session. During your session, keep a catalog of all changes, decisions, open issues, modifications to this document, etc.

## The use of AI
You are one of two AI tools used in the project. You are code architect/designer. The other AI has access to my local drive and functions as code implementor.

Typical Workflow:

1. You work with Stan to arrive at a plan to provide the solution to an issue.
2. You provide instructions to the other AI.
3. Stan gives those instructions to the other AI.
4. The other AI implements and describes the results.
5. Stan gives that to you.
6. If you approve, Stan executes something like this: `stanleybaptista@mac helm % git add . && git commit -m "Checklist: new items sort to top; Manage Groups moved to section header" && git push`
7. If not, steps 1-5 are repeated.

## Project Overview
**Helm** is a personal trip companion web app replacing CAN26, starting with Stan and Cathy's Canadian Rockies Rocky Mountaineer GoldLeaf trip in October 2026. Stack: Next.js (App Router) / Supabase / Vercel. Data entry is manual CRUD, section by section.

## Versioning
- Format: `MM.mm.nnnn`
- Defined in `lib/version.ts` as `VERSION` constant
- **Bump with every Git push — no exceptions, including bug fixes**
- Testing is done on Vercel (no local testing currently)
- **Current version: `00.01.0053`** (bumped this session, not yet confirmed on Vercel due to build error — see below)

## Handoff Naming
`Helm_Handoff_[Mon][DD][letter].md` — e.g. `Helm_Handoff_Apr07b.md`

## Working Rules
0. **Never build without Stan's explicit go-ahead.**
1. **Plan first.** Present the plan. Wait for confirmation. Then build.
2. **Never propose a plan and then build in the same response.**
3. **Stan sets the pace.** Do not race ahead or propose unprompted next steps.
4. **Context is king.** If you aren't sure of a file path or schema, ask.
5. **Every push gets a version bump** — bug fix or feature, no exceptions.

## Instruction Document Format
Two documents are produced per build:
- `Helm_Instructions_[Mon][DD][letter]_AI.md` — for the implementing AI (no git commands)
- `Helm_Instructions_[Mon][DD][letter]_Stan.md` — for Stan (git push + Vercel verification steps only)

## Gold Standard Pattern
The reference implementation is `TransportationClient.tsx`. All CRUD sections follow this pattern exactly:
- `components/sections/[Section]Client.tsx` — client component with BottomSheet, form state, save/delete logic
- `components/sections/[Section]Section.tsx` — thin async server wrapper, fetches initial data, renders Client
- `app/api/trips/[id]/[section]/route.ts` — GET + POST
- `app/api/[section]/[id]/route.ts` — PATCH + DELETE

### API Route Pattern (critical — must match exactly)
- Uses inline `serviceClient()` and `getAuthUserId()` helpers — **there is no shared lib file for these**. Every API route in Helm defines them inline at the top of the file. This was confirmed this session by reading Transportation and Checklist routes.
- `params` is always `Promise<{ id: string }>` and must be awaited
- POST and PATCH/DELETE include `trip_members` ownership check
- GET does not require auth check
- DELETE uses soft delete: `update({ deleted_at: new Date().toISOString() })`
- DELETE returns `NextResponse.json({ success: true })` (not 204)

### Export Pattern (critical)
- Section server components (e.g. `PackingSection.tsx`) use **named exports**, not default exports
- Import style: `import { PackingSection } from '@/components/sections/PackingSection'`
- This matches how ChecklistSection, TransportationSection, etc. are exported
- Using `export default` instead of `export function` will cause a Vercel build failure

### Env Var Names (critical)
- Service role key env var is `SUPABASE_SECRET_KEY` — not `SUPABASE_SERVICE_ROLE_KEY`
- Confirmed by reading existing Transportation route
- Any new seed scripts or utilities must use `SUPABASE_SECRET_KEY`

## Known Global CSS Fix (already applied)
`globals.css` scopes appearance reset to `input:not([type="checkbox"])` to preserve native checkbox rendering. If checkboxes are invisible in any section, verify this rule is in place.

## Deployment Workflow
1. Claude (architect) produces two instruction documents: one for implementing AI, one for Stan
2. Implementing AI places files and bumps version
3. Stan runs SQL in Supabase SQL Editor (Stan always does this manually)
4. Stan runs seed script if applicable
5. Stan runs `git push`
6. Test on Vercel after deploy

---

## Session Catalog — Apr07b

| # | Activity |
|---|---|
| 1 | Session opened with Apr07a handoff. Packing schema questions answered. |
| 2 | CAN26 `data.json` and `index.html` reviewed — packing structure has two-level grouping (`cat`/`sub`), two checkboxes per item (`owned`/`packed`), per-person lists (stan/cathy tabs). |
| 3 | Packing schema decisions: per-person tabs, two-level reorderable groups/subgroups, owned + packed checkboxes, no quantity field. |
| 4 | Packing section planned and approved: 3 tables, 7 API routes, 2 components, seed script for 81 Stan items. |
| 5 | Instruction documents `Helm_Instructions_Apr07c_AI.md` and `Helm_Instructions_Apr07c_Stan.md` produced and delivered. |
| 6 | Known issue identified from screenshot: new section header buttons (e.g. "Add Hotel") didn't appear on first pass in previous builds. Root cause: tab registered but section component not fully mounted. Step 5 of AI instructions strengthened to prevent recurrence. |
| 7 | AI2 confirmed PackingSection already wired into tab system in `TripDetailView.tsx` and `app/advisor/trips/[id]/page.tsx`. |
| 8 | AI2 confirmed `serviceClient()` and `getAuthUserId()` are inlined in all existing routes — no shared lib file exists. New routes correctly follow same pattern. |
| 9 | Env var discrepancy caught and fixed: seed script used `SUPABASE_SERVICE_ROLE_KEY`, corrected to `SUPABASE_SECRET_KEY` to match codebase. |
| 10 | `dotenv` not installed — AI2 fixed seed script to read `.env.local` manually via `fs` instead. |
| 11 | SQL run successfully in Supabase. Schema verified: `packing`, `packing_groups`, `packing_subgroups` all correct. |
| 12 | Seed script run successfully: 5 groups, 9 subgroups, 81 items confirmed via SQL count query. |
| 13 | Git push triggered Vercel build failure: `Export PackingSection doesn't exist in target module` — `PackingSection.tsx` used `export default` instead of named export `export function PackingSection`. |
| 14 | Fix identified: change `PackingSection.tsx` to use named export. Instruction sent to AI2. Session paused — Stan making dinner. |

---

## Packing — IN PROGRESS (build error, fix pending)

### Schema (deployed to Supabase ✅)
- Table: `packing` — items with `person`, `group_id`, `subgroup_id`, `text`, `owned`, `packed`, `sort_order`
- Table: `packing_groups` — per-person top-level categories with `sort_order`
- Table: `packing_subgroups` — per-person sub-categories linked to group with `sort_order`
- All three tables have full RLS policies

### Seed data (run successfully ✅)
- Stan: 5 groups, 9 subgroups, 81 items seeded
- Cathy: empty (to be built manually in Helm)

### Build status
- **Vercel build FAILED** at `00.01.0053` push
- Error: `PackingSection.tsx` uses `export default` — must be changed to named export `export function PackingSection`
- Fix instruction sent to AI2 — awaiting implementation
- Once fixed, push again and verify on Vercel

### Pending verification checklist (run after successful deploy)
1. Packing tab visible in trip nav
2. Stan tab shows items grouped by category and sub-category
3. Cathy tab is empty
4. Owned checkbox (gold) and packed checkbox (navy) work with optimistic update
5. Tapping item row opens BottomSheet with correct values
6. Manage Categories shows 5 categories in correct order (Clothes, Bags, Toiletries & Tech, Meds, Support)
7. Manage Sub-groups on Clothes shows 6 sub-groups (Flights, Outer, Tops, Bottoms, Underwear, Socks)
8. Version shows `00.01.0053`

---

## Checklist — WORKING at `00.01.0052`

### Checklist schema
- Table: `checklist` — items with `item_number` auto-increment trigger per trip
- Table: `checklist_groups` — named groups with `sort_order`, manually reorderable

### Checklist UI features (current)
- Grouped by `group_name` in `sort_order` order
- New items sort to top of their group (`item_number DESC`)
- Filter bar: Open · Urgent · Completed (client-side)
- One-tap status toggle (open ↔ completed) on list row with optimistic update
- `#N` item number per row
- BottomSheet: Task, Group (dropdown), Due Date, Reference, Status, Resolution, Notes, Urgent
- Inline "New Group…" option in dropdown — creates group immediately via API
- "Manage Groups" button in section header (ghost button, left of "Add Item")
- "Manage Groups" nested BottomSheet — up/down reorder, delete (blocked if items exist), Create Group input at bottom
- Delete blocked server-side (409) if group has active items

---

## TODOS for Next Session
- [ ] Resolve Packing build error: AI2 to fix `PackingSection.tsx` named export, then re-push
- [ ] Verify Packing section on Vercel against checklist above
- [ ] Continue Gold Standard refactor: **Key Info** section
- [ ] Future cleanup: `restaurants` table has duplicate `website`/`website_url` columns
- [ ] Note for future instruction documents: always specify named exports for Section server components
