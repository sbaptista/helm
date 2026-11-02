# Packing — Delete categories that have items (plan)

**Status:** approved by Stan 2026-11-01; built in 00.04.0018. Migration `202611010002_delete_packing_category.sql` to be applied by Stan.
**Target version:** `00.04.0018`

## Today

- The × on a Manage Categories row is greyed out when the category has items directly in it. It deletes straight away, with no warning.
- The server refuses (409) when the category has any items, including items in its sub-groups.
- A category with sub-groups but no items can be deleted, but its sub-groups are left behind, hidden but not deleted.

## Change

1. **Delete with items:** × is always available. Deleting a category also deletes its sub-groups and every item in it, in one step, so it never ends up half done.
2. **Warn first:** tapping × replaces that row with a confirmation, in the same style as Delete for selected items:
   - With contents: "Delete **Clothing** with 2 sub-groups and 24 items?"
   - Empty: "Delete **Clothing**?"
   - Buttons: **Cancel** and **Delete** (red), both 44pt. Helm has no undo, so the message says so.
   - Only one row asks at a time. Closing the sheet, renaming or reordering cancels it.
3. **In progress:** while it saves, the "in progress" box shows "Deleting Clothing…" and blocks the screen, like the other Packing actions. A toast confirms, e.g. "Clothing deleted (2 sub-groups, 24 items)".

Deleted items also leave the current selection, if Select is on.

## Offline

- **Empty category** (no items, no sub-groups): it still deletes offline and syncs later, as today.
- **Category with contents:** it needs a connection. Offline, the confirmation says "Deleting a category with items needs a connection" and Delete is greyed out.

Deleting many records offline and syncing them later would need new conflict handling, so it stays out of this version.

## How it works

- **New database function:** `delete_packing_category(p_trip_id, p_user_id, p_group_id)` in one transaction:
  - It checks trip membership.
  - It soft-deletes (`deleted_at`) the items, the sub-groups and the category, with the same timestamp.
  - It returns the removed ids.
  - `SECURITY DEFINER`, with execute granted to `service_role` only, like `copy_packing_list` and `move_copy_packing`.
- **Route:** the existing `DELETE /api/packing-groups/[id]` calls the function instead of refusing with 409. The offline path for an empty category goes through the same route.
- **Client:** removes the returned items, sub-groups and category from the list and from the device copy.

## Database impact

| Question | Answer |
|---|---|
| New tables | None |
| New query pattern | Look-ups by trip and `group_id` on `packing` and `packing_subgroups`. These tables hold a few hundred rows per trip, so no new index is needed. |
| Realtime | None |
| How often it writes | Only when a deletion is confirmed: one transaction. |
| RLS | Unchanged. The function runs with the service role behind the route's membership check. |
| Migration | One new file, `supabase/migrations/202611010002_delete_packing_category.sql`, which Stan applies. |

Soft delete means the rows stay in the database, so a mistaken deletion could be recovered by hand in Supabase, though Helm has no undo.

## Also included

- **Version:** bump to `00.04.0018`.
- **Changelog:** a new entry in `lib/changelog.ts`.
