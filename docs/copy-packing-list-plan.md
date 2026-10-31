# Copy Packing List to Another Trip — Plan

**Status:** proposed and approved by Stan 2026-10-31 with the recommended choices (merge, copy as unpacked, choose whose list); built as v00.04.0011 — Claude Code (Opus 5.5). Migration `supabase/migrations/202610310001_copy_packing_list.sql` **not yet applied**; not yet tested.

## Request

Stan: add a button in Packing to copy a packing list to another trip.

## Current state (research)

- Packing has three tables, all per trip and per person (`'stan' | 'cathy'`):
  `packing_groups` (categories), `packing_subgroups` (belong to a group),
  `packing` (items: `text`, `owned`, `packed`, `group_id`, `subgroup_id`,
  `sort_order`). Soft delete via `deleted_at`; `updated_at` trigger since
  `202610300001`.
- `components/sections/PackingClient.tsx` shows one person's list at a time
  (Stan / Cathy tabs). Toolbar: Reset Packed, Manage Categories, Add Item.
- `copy_trip` (`202610260001_show_in_itinerary.sql`) already copies all three
  tables into a **new** trip, remapping group and subgroup IDs in jsonb maps.
  It keeps `packed` as is. Nothing copies into an **existing** trip.
- No API lists a user's trips; the dashboard loads them server-side.
- `types/sections.ts` `PackingRow` is out of date (`item`, `category`); the
  client's own interfaces are the accurate ones.

## Proposed behaviour

1. A **Copy to Trip…** button in the Packing toolbar (ghost, `sm`, 44pt hit
   target), disabled offline (`useIsOnline()`), like other trip actions.
2. It opens a `ResponsiveSheet`:
   - **Whose list:** Stan / Cathy / Both (defaults to the open tab).
   - **Copy to:** a list of the other trips you are an advisor on, excluding
     this trip and Archived trips; the title, destination and status are shown for each.
   - A sentence that says what will happen, then **Copy** / **Cancel**.
3. **Merging into a trip that already has a list** (recommended):
   - A category with the same name (case-insensitive, trimmed) for that person
     is reused. Otherwise it is created at the end.
   - The same applies to subgroups within a category.
   - An item whose text already exists in the same category and subgroup is
     skipped. New items are appended after existing ones.
   - Nothing in the destination is changed or deleted.
4. Copied items start **unpacked**; `owned` is kept.
5. Toast: "Copied 42 items (3 skipped) to Alaska 2027". Stay on this trip.

## Implementation

- **Migration** `supabase/migrations/2026110X0001_copy_packing_list.sql`, which Stan
  applies: function
  `copy_packing_list(p_source_trip_id uuid, p_target_trip_id uuid, p_people text[], p_user_id uuid) returns jsonb`
  (`{groups, subgroups, items, skipped}`). It runs in one transaction, so a copy either
  completes or does nothing. It checks that the user is an advisor on **both** trips,
  that source ≠ target, and that the target is not Archived. Same style as `copy_trip`
  (jsonb ID maps; `security invoker`; called with the service client; `execute`
  revoked from `public`/`anon`/`authenticated`).
- **API** `POST /api/trips/[id]/packing-copy` `{ targetTripId, people }` →
  calls the RPC, returns counts. Errors go to `logger.error` only on unexpected failures.
- **API** `GET /api/trips/[id]/copy-targets` → the user's other advisor
  trips (id, title, destination, status), not Archived.
- **UI** in `PackingClient.tsx`: button, sheet, fetch targets when the sheet opens.
- Version bump + `lib/changelog.ts` entry.

## Database impact

| Question | Answer |
|---|---|
| New query pattern? | Yes, two: (a) trips by `trip_members.user_id` + `role = 'advisor'`, which the dashboard and `copy_trip` already use; (b) within the function, groups/subgroups/items by `trip_id` + `person`, which Packing already queries. No new index needed at Helm's size (a few trips, hundreds of rows). |
| Realtime? | No. |
| Frequent writes? | No. One user-initiated bulk insert (typically 50–300 rows across the three tables). It makes no updates or deletes, so no dead tuples. The `updated_at` trigger fires once per inserted row. |
| New table? | No. No RLS changes. |
| New WHERE/JOIN column? | No. |
| New DB object | One function (`copy_packing_list`). The migration is idempotent (`create or replace`). |

**Offline:** the copy is online-only. If the destination trip is already saved on a device,
its copy refreshes the next time that trip is opened online (`useOfflineList`).

## Open decisions for Stan

1. Merge (recommended) vs. add everything even if duplicated vs. replace the
   destination list (deletes data; not recommended).
2. Copy `packed` as unpacked (recommended) or keep it as is.
3. Whose list: active tab with Stan / Cathy / Both choice (recommended), or
   always both.

## Verification

Typecheck and lint. Then Stan applies the migration and tests on localhost:
copy into an empty trip, copy again (everything is skipped), copy into a trip with an
overlapping category, and try it while offline (button disabled). Check on iPad and iPhone through the Bonjour URL.
