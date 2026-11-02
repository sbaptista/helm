# Packing — Move and Copy (plan)

**Status:** approved by Stan 2026-11-01; built in 00.04.0016. Migration `202611010001_move_copy_packing.sql` to be applied by Stan.
**Target version:** `00.04.0016`

## Selected items: Move… and Copy…

- **Buttons:** the selection bar gets two new buttons, **Move…** and **Copy…**, next to Owned and Packed.
- **Destination sheet:** both buttons open the same sheet with three choices:
  - **Person:** Stan or Cathy. It starts on whoever's tab is open, so items can be moved or copied to the other person.
  - **Category:** that person's categories.
  - **Sub-group:** "None (directly in the category)" or one of that category's sub-groups.
- **Move:** the selected items go to the end of the destination, in their current order. The selection clears afterwards and a toast confirms, e.g. "5 items moved to Cathy › Toiletries".
- **Copy:** works the same way as Copy to Trip:
  - Copies keep **Owned** and start **not Packed**.
  - If the destination already has an item with the same name (trimmed, case-insensitive), that item is skipped. The toast says how many were skipped.
- **Blocked choices:**
  - Moving items to the place they're already in.
  - Copying to a destination where every item already exists.
- **Busy dialog:** the "in progress" dialog (`BusyOverlay`) shows during both.

## Sub-groups: Move/Copy…

- **Button:** each row in **Manage Sub-groups** gets a **⇄** button (44px tap target), next to ✎ rename.
- **Destination sheet:** pick Person and Category, then **Move** or **Copy**. The sub-group's items go with it.
- **Name already exists at the destination:** the two sub-groups merge into one. Duplicate items are skipped, and on a move the emptied original sub-group is removed (soft delete).
  - This is the common case. For example, Cathy probably already has a "Toiletries" sub-group.
  - It's also how Copy to Trip behaves, and it keeps the rename rule: no two sub-groups in a category share a name.
- **Same category:** a sub-group can't be moved or copied into the category it's already in.

## How it works

- **New database function:** `move_copy_packing(...)` in a new migration, built the same way as `copy_packing_list`:
  - It runs as one transaction, so a move never ends up half done.
  - It checks trip membership, and that the destination category and sub-group belong to this trip and to the chosen person.
  - `SECURITY DEFINER`, with execute granted to `service_role` only.
- **New route:** `POST /api/trips/[id]/packing-move` calls the function. The list then updates on screen and in the device copy.

## Needs a connection

Like Copy to Trip, both actions are greyed out offline and labelled "(needs a connection)".

Offline moves of items could be added later with the existing offline queue (per-item `PATCH` of `person`, `group_id`, `subgroup_id`, `sort_order`). Copies and sub-group moves would need much more work offline, so they're left out of this version.

## Database impact

| Question | Answer |
|---|---|
| New tables | None |
| New query pattern | Look-ups by trip, person, category and sub-group, the same pattern Copy to Trip already uses. No new index needed. |
| Realtime | None |
| How often it writes | Only on a Move or Copy tap: one transaction per action, not per keystroke or render. |
| RLS | Unchanged. The function runs with the service role behind the route's membership check. |
| Migration | One new file, `supabase/migrations/202611010001_move_copy_packing.sql`, which Stan applies. |

## Also included

- **Version:** bump to `00.04.0016`.
- **Changelog:** a new entry in `lib/changelog.ts`.

## As built (00.04.0016)

- The destination sheet also has a **Move / Copy** toggle, so the choice can be changed after opening it. The ⇄ sub-group button opens it on Move.
- Opening Move/Copy for a sub-group closes the Manage Sub-groups sheet first, so two sheets are never stacked.
- Sub-group move into a same-named sub-group: an item that is already at the destination is soft-deleted from the source (the destination keeps its own copy, with its own Owned and Packed), so the source sub-group ends up empty and is soft-deleted too.
- Moving selected items never skips by name. Only items already in the chosen place are left where they are.
- Before calling the server, the client sends any changes still waiting in the offline outbox, so the move acts on current rows. If they can't be sent, it stops and says so.
- The route returns the changed rows. The client updates its list and the device copy (`snapshotUpsert` / `snapshotRemove`) from them.
- **00.04.0017 fix:** the page stayed locked (no scrolling) after a Move or Copy. The sheet was unmounted in the same render that closed `BusyOverlay`, so React ran the sheet's scroll-lock cleanup before the overlay's, and the overlay then put back `overflow: hidden`. The sheet now stays mounted and toggles `open`, like the other Packing sheets.
