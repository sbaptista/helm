# Helm Handoff — Apr07c

## About this Handoff
My name is Stan. Read this handoff carefully. You will be responsible for updating it for the next session. During your session, keep a catalog of all changes, decisions, open issues, modifications to this document, etc.

## The use of AI
You are one of two AI tools used in the project. You are code architect/designer. The other AI has access to my local drive and functions as code implementor.

Typical Workflow:

1. You work with Stan to arrive at a plan to provide the solution to an issue.
2. You provide instructions to the other AI (AI2).
3. Stan gives those instructions to AI2.
4. AI2 implements and describes the results.
5. Stan gives that to you.
6. If you approve, Stan executes the git push.
7. If not, steps 1-5 are repeated.

## Project Overview
**Helm** is a personal trip companion web app replacing CAN26, starting with Stan and Cathy's Canadian Rockies Rocky Mountaineer GoldLeaf trip in October 2026. Stack: Next.js (App Router) / Supabase / Vercel. Data entry is manual CRUD, section by section.

## Versioning
- Format: `MM.mm.nnnn`
- Defined in `lib/version.ts` as `VERSION` constant
- **Bump with every Git push — no exceptions, including bug fixes**
- Testing is done on Vercel (no local testing currently)
- **Current version: `00.01.0054`**

## Handoff Naming
`Helm_Handoff_[Mon][DD][letter].md` — e.g. `Helm_Handoff_Apr07c.md`

## Working Rules
0. **Never build without Stan's explicit go-ahead.**
1. **Plan first.** Present the plan. Wait for confirmation. Then build.
2. **Never propose a plan and then build in the same response.**
3. **Stan sets the pace.** Do not race ahead or propose unprompted next steps.
4. **Context is king.** If you aren't sure of a file path or schema, ask.
5. **Every push gets a version bump** — bug fix or feature, no exceptions.

## Instruction Document Format
Two documents are produced per build:
- `Helm_Instructions_[Mon][DD][letter]_AI.md` — for AI2 (code files only, no SQL)
- `Helm_Instructions_[Mon][DD][letter]_Stan.md` — for Stan (all SQL blocks with verification queries, git push, Vercel verification steps)

**SQL always goes in Stan's document, never in AI2's document.** Stan runs all SQL manually in the Supabase SQL Editor.

## Gold Standard Pattern
The reference implementation is `TransportationClient.tsx`. All CRUD sections follow this pattern exactly:
- `components/sections/[Section]Client.tsx` — client component with BottomSheet, form state, save/delete logic
- `components/sections/[Section]Section.tsx` — thin async server wrapper, fetches initial data, renders Client
- `app/api/trips/[id]/[section]/route.ts` — GET + POST
- `app/api/[section]/[id]/route.ts` — PATCH + DELETE

### API Route Pattern (critical — must match exactly)
- Uses inline `serviceClient()` and `getAuthUserId()` helpers — **there is no shared lib file for these**. Every API route in Helm defines them inline at the top of the file. Confirmed by reading Transportation and Checklist routes.
- `params` is always `Promise<{ id: string }>` and must be awaited
- POST and PATCH/DELETE include `trip_members` ownership check
- GET does not require auth check
- DELETE uses soft delete: `update({ deleted_at: new Date().toISOString() })`
- DELETE returns `NextResponse.json({ success: true })` (not 204)

### Export Pattern (critical)
- Section server components use **named exports**, not default exports
- Import style: `import { PackingSection } from '@/components/sections/PackingSection'`
- Using `export default` instead of `export function` will cause a Vercel build failure
- This applies to all Section server components — KeyInfoSection, PackingSection, ChecklistSection, etc.

### Env Var Names (critical)
- Service role key env var is `SUPABASE_SECRET_KEY` — not `SUPABASE_SERVICE_ROLE_KEY`
- Any new seed scripts or utilities must use `SUPABASE_SECRET_KEY`

### Seed Script Pattern
- No `dotenv` dependency — read `.env.local` manually via `fs`
- Accept `trip_id` as CLI argument: `node seed-[section].js <trip_uuid>`
- Exit with clear error if env vars or trip_id argument are missing

## Known Global CSS Fix (already applied)
`globals.css` scopes appearance reset to `input:not([type="checkbox"])` to preserve native checkbox rendering. If checkboxes are invisible in any section, verify this rule is in place.

## 3-Line Truncation Pattern (established this session)
Applied to long text values in list views via `.line-clamp-3` utility class in `globals.css`:
```css
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```
Currently applied to Key Info value field. **Future task:** apply to all other section list views where long text appears (Hotels notes, Transportation notes, Restaurants notes, etc.).

## Deployment Workflow
1. Claude (architect) produces two instruction documents
2. AI2 places all code files and bumps version
3. Stan runs SQL in Supabase SQL Editor (from Stan's instruction doc)
4. Stan runs seed script if applicable
5. Stan runs `git push`
6. Test on Vercel after deploy

---

## Session Catalog — Apr07a through Apr07c

| # | Activity |
|---|---|
| 1 | Session opened with Apr07a handoff. |
| 2 | Packing schema questions answered using CAN26 data.json and index.html. |
| 3 | Packing decisions locked: per-person tabs (Stan/Cathy), two-level reorderable groups/subgroups, owned + packed checkboxes, no quantity. |
| 4 | Packing section planned and approved: 3 tables, 7 API routes, 2 components, seed script for 81 Stan items. |
| 5 | Known missing-buttons issue documented: caused by tab registered without full component mounted. Step 5 of instructions strengthened with explicit read-back verification requirement. |
| 6 | AI2 confirmed PackingSection already wired into tab system. Named export bug caught and fixed post-build. |
| 7 | Inline helper pattern confirmed: no shared lib for serviceClient/getAuthUserId. All routes inline these. |
| 8 | Env var discrepancy caught: SUPABASE_SERVICE_ROLE_KEY → SUPABASE_SECRET_KEY. |
| 9 | dotenv not installed — seed script fixed to read .env.local via fs instead. |
| 10 | SQL run, schema verified, seed confirmed: 5 groups, 9 subgroups, 81 items. |
| 11 | Packing build failed: export default → export function fix applied and redeployed. |
| 12 | Packing verified on Vercel at 00.01.0053. ✅ |
| 13 | Key Info refactor planned: key_info_groups table, group_id migration, 4 API routes, CRUD UI, tappable URLs, ACTION REQUIRED badge, 3-line truncation. |
| 14 | packing_items orphan table identified (81 stale rows from old import pipeline) — dropped as part of Key Info SQL. |
| 15 | SQL split established as permanent workflow: SQL always in Stan's doc, never AI2's doc. |
| 16 | Key Info SQL run: packing_items dropped, key_info_groups created, group_id added, all 29 rows migrated. |
| 17 | Key Info verified on Vercel at 00.01.0054. All 9 checklist items passed. ✅ |
| 18 | AI2 also fixed page.tsx packing reference that was still pointing to dropped packing_items table. |

---

## Section Status

| Section | Status | Version |
|---|---|---|
| Checklist | ✅ Full CRUD | 00.01.0052 |
| Packing | ✅ Full CRUD | 00.01.0053 |
| Key Info | ✅ Full CRUD | 00.01.0054 |
| Transportation | ✅ Full CRUD | earlier |
| Hotels | ✅ Full CRUD | earlier |
| Flights | ✅ Full CRUD | earlier |
| Restaurants | ✅ Full CRUD | earlier |
| Itinerary | ✅ Full CRUD | earlier |

---

## TODOS for Next Session

- [ ] **Localhost dev environment** — `localhost:3000` (and TODOS app) doesn't function because magic link auth redirects to the Vercel URL. Fix so that local dev works for iterative testing without requiring a deploy. Needs investigation: likely a Supabase redirect URL configuration issue + `NEXTAUTH_URL` or equivalent env var for local.
- [ ] **Claude access to TODOS app** — explore ways to give the architect AI (Claude) read access to the TODOS backlog so it can reference, plan against, and mark items during sessions. Options to consider: API endpoint with read token, exported snapshot in handoff, or other approach.
- [ ] **3-line truncation** — apply `.line-clamp-3` to long text fields in other section list views: Hotels notes, Transportation notes, Restaurants notes, etc.
- [ ] **restaurants table cleanup** — duplicate `website`/`website_url` columns need to be resolved.
