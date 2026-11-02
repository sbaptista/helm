# Checklist — bring over the Packing improvements (plan)

**Status:** approved by Stan 2026-11-01 with the recommended choices for 1 and 2. For 3, build everything at once and test in the four groups, in order. Built in 00.04.0020; migration `202611010003_checklist_groups_and_copy.sql` to be applied by Stan.
**Version:** `00.04.0020`.

## Request

Stan: "Apply everything applicable from the changes to packing list to checklist."

## How Checklist differs from Packing

These differences decide what carries over and how:

- **No people, no sub-groups.** Checklist has one list per trip, with one level of groups. Anything about Stan / Cathy or sub-groups doesn't apply.
- **Items point at their group by name, not by id.** `checklist.group_name` holds the group's name as text. So renaming or deleting a group must also change its items, in the same transaction. Otherwise the items drift into "(No Group)".
- **Groups are deleted outright.** `checklist_groups` has no `deleted_at`, unlike `packing_groups`. Items are soft-deleted (`deleted_at`), as in Packing.
- **Google Calendar.** An item with a due date can have Calendar events. Every change has to set `gcal_dirty` the way the single-item routes already do, so the next sync updates or removes the events.
- **Filters.** Open, Attention Required and Completed narrow the list. Packing has nothing like them.

## What carries over

| # | Packing feature (version) | For Checklist |
|---|---|---|
| 1 | Multi-select and bulk actions, with a blocking progress dialog (0012–0013) | **Yes.** The actions change for Checklist. |
| 2 | Controls pinned at the top, with a More ⋯ menu on iPhone (0014–0015) | **Yes** |
| 3 | Rename categories (0015) | **Yes.** Renaming a group also renames it on its items. |
| 4 | Move selected items to another category (0016) | **Yes.** Move to another group. |
| 5 | Copy selected items / sub-groups (0016) | **No.** See "Left out". |
| 6 | Delete a category that has items, with a warning and progress (0018) | **Yes** |
| 7 | Show / hide category contents (0019) | **Yes** |
| 8 | Copy the whole list to another trip (0011) | **Yes**, with a choice for Stan about dates. |

## 1. Select and act on many items

- A **Select** button in the controls. **Done** leaves Select mode and clears the selection.
- **In Select mode:**
  - Each item gets a 44pt checkbox, and tapping the row selects it instead of opening it.
  - The round complete circle is hidden, so a stray tap can't complete an item.
  - Each group heading gets a checkbox: ticked when all its items are selected, a dash when only some are.
- **Selection bar:** Select All / Deselect All, "N selected", then the actions:
  - **Complete** and **Reopen**: set Status to Completed or Open.
  - **Attention ✓** and **Attention ✗**: set Attention Required on or off. The Attention Note is kept.
  - **Move…**: see section 4.
  - **Delete…**: asks "Delete N items?" with Cancel and Delete in the bar.
- **Filters:** Select All selects only the items the filters show. Items hidden by a filter, or inside a hidden group, keep their selection but are counted. The bar then reads "12 selected (3 not shown)", so nothing is changed unseen.
- **Speed and progress:**
  - A new route, `POST /api/trips/[id]/checklist-bulk`, handles the whole selection in one request, like `packing-bulk`. It accepts only `status` / `action_required` / `group_name` and at most 1000 ids. It sets `gcal_dirty` as the single-item routes do, and a delete also turns off `gcal_include`.
  - The existing `apiBulk()` sends to it. Offline, or behind waiting changes, `apiBulk()` falls back to one save per item, so bulk actions also work offline.
  - The same blocking "Updating 12 items…" dialog (BusyOverlay) shows. A toast confirms, and lists any items that couldn't be saved.
  - After any change that touches Calendar fields, the page tells Calendar sync that something changed (`gcal:dirty`), as Save does today.

## 2. Pinned controls

- **Pinned under the trip top bar:**
  - The heading line ("Checklist · 12 of 30 complete").
  - Manage Groups, Select, Show All / Hide All, Copy to Trip and Add Item.
  - The filter chips.
  - The selection bar.
  - It reuses Packing's `--trip-bar-bottom` position, so it stays pinned on iPhone when the trip name wraps.
- **iPhone (under 768px):** Add Item, Select and More ⋯ stay in the bar. Manage Groups, Show All / Hide All and Copy to Trip move into More ⋯, as in Packing.
- **Warning banner:** the "⚠ 3 items need attention" banner scrolls with the list, so the pinned area stays short.

## 3. Rename groups

- **In Manage Groups:** each row gets a ✎ button (44pt) next to ↑ ↓ ×. Tapping it turns the name into a field with Save and Cancel; Enter saves and Escape cancels.
- **Validation:** the name is required and can't match another group's name (ignoring case), checked on blur and on Save. A duplicate name would merge the two groups' items, because items find their group by name.
- **Saving:** a database function, `rename_checklist_group`, renames the group and changes `group_name` on its items in one transaction. Today, Edit Item alone would leave the items behind under the old name.
- **Needs a connection:** rename is online only, because an offline rename can't safely be merged with other offline item edits. Offline, ✎ is greyed out with "Renaming needs a connection." It goes through the existing `PATCH /api/checklist-groups/[id]`, which calls the function when `name` changes.

## 4. Move selected items to another group

- **Move…** in the selection bar opens a small sheet: choose a group, or No Group, then Move.
- This is a bulk update of `group_name` through the route from section 1, so it also works offline.
- The selection stays, and the destination group is shown if it was hidden.
- The sheet stays mounted and opens and closes with `open`, never by being removed. This avoids the 0016 freeze (Knowledge `b70fda2f`).

## 5. Delete a group with items

- **The × button** in Manage Groups always works (44pt). Tapping it turns the row into a confirmation:
  - "Delete **Hotels** with 6 items? This can't be undone." with Cancel and Delete. Delete is red, and both buttons are 44pt.
  - An empty group just asks "Delete **Hotels**?"
  - Rename, reorder, or closing the sheet cancels it.
- **Saving:** a database function, `delete_checklist_group`, soft-deletes the items and deletes the group in one transaction. It turns off `gcal_include` and marks items with Calendar events dirty, so the next sync removes them.
- **While it runs:** the progress dialog shows "Deleting Hotels…", and a toast confirms "Hotels deleted (6 items)".
- **Offline:** a group with items needs a connection, and Delete is greyed out with a note, as in Packing. An empty group still deletes offline.
- **Unsaved items:** before deleting, it sends any changes still waiting on this device (`flushOutbox()`). If they can't be sent, it stops and says so.

## 6. Show / hide groups

- **On each heading:** ▾ / ▸ on every group heading, including "(No Group)"; tapping the name does the same. A hidden group keeps its heading and "3/8" count.
- **Show All / Hide All:** one button that switches between the two.
- **Remembered on this device only:** `localStorage` key `helm-checklist-hidden-<tripId>`. It's read in `useEffect`, wrapped in try/catch, and cleared of deleted groups when saved. It isn't synced, as in Packing.
- **Revealing:** saving an item into a hidden group shows that group. Opening an item from Search or the Itinerary (the highlight jump) also shows its group first.

## 7. Copy the checklist to another trip

- **Copy to Trip…** opens a sheet that lists the other trips you can copy to (the same list Packing uses, `copy-targets`), then Copy.
- **Merging:**
  - Groups merge by name, ignoring case, and missing groups are added at the end.
  - Items whose task text is already in the same group are skipped (trimmed, ignoring case).
  - New items are numbered after the destination's highest item number.
- **What each copy keeps:** task, group, notes, Attention Required and its note.
- **What each copy resets:**
  - Status becomes Open.
  - Resolution is cleared.
  - Calendar is off.
  - Due date and Reference: **Stan to choose** (below).
- **Saving:** a database function, `copy_checklist`, runs in one transaction behind `POST /api/trips/[id]/checklist-copy`. It needs a connection. The progress dialog shows, and a toast reports "Copied 24 items to Banff 2027 (3 already there)".

## Left out

- **Copying items within the same trip** (Packing's Copy mode). A checklist has one owner, so copying a task into a second group of the same trip would just make a duplicate. Copy to Trip (section 7) covers moving tasks between trips.
- **Reset Packed.** It has no Checklist equivalent. Select All followed by Reopen does the same job.

## Decisions for Stan

1. **Copy to Trip, due dates and references** (recommended: clear both). Dates and booking numbers belong to the source trip. Kept dates could put old Calendar dates on the new trip, although Calendar stays off until it's turned on.
2. **Attention actions in the selection bar** (recommended: include them). Complete / Reopen alone would be shorter on iPhone.
3. **Build order** (recommended): one test round per step.
   - 0020: select, bulk actions and move.
   - 0021: pinned controls.
   - 0022: rename, delete with items, and show / hide.
   - 0023: Copy to Trip.

## Database impact

| Question | Answer |
|---|---|
| New tables, columns, policies, Realtime | None. |
| New functions | `rename_checklist_group`, `delete_checklist_group` and `copy_checklist`. Each is `SECURITY DEFINER`, with execute granted to `service_role` only, like the Packing functions. Stan applies two migrations: one for rename / delete (0022), one for copy (0023). |
| New query patterns | Look-ups by `trip_id` + `group_name`, and updates by id within a trip. A trip has tens of checklist rows, so no new index is needed. |
| Write frequency | Only when an action is confirmed: one statement or one transaction per action, fewer than tapping items one at a time. |
| Calendar | Changed rows are marked `gcal_dirty` as today. A bulk change can queue many Calendar updates for the next sync, the same as editing those items one by one. |

## Also included

- **Each step:** a version bump, a `lib/changelog.ts` entry, and a HANDOFF update.
- **Tests:** a typecheck and lint, then Stan tests on Mac, iPad and iPhone, online and offline.

## As built (00.04.0020)

- **One migration** holds all three functions: `supabase/migrations/202611010003_checklist_groups_and_copy.sql`. Rename, delete-with-items and Copy to Trip return "…database setup is not yet applied" until it is.
- **Pinned controls:** the heading and the "N of M complete" line scroll away, as in Packing. The toolbar, filter chips and selection bar are pinned. They reuse Packing's `.pack-controls`, `.pack-toolbar-*` and `.pack-more-*` classes, so there is no new CSS.
- **Sheets:**
  - Move and Copy to Trip close their sheet before the progress dialog opens, and every sheet stays mounted (Knowledge `b70fda2f`).
  - Rename, a delete with items, and Copy to Trip send waiting changes first (`flushOutbox()`).
- **Shared code:** `SelectBox`, `ShowHideButton` and `plural` moved to `components/ui/SelectionControls.tsx`. Packing and Checklist both use them.
- **Test groups for Stan, in order:**
  1. Select, the bulk actions, and Move.
  2. Pinned controls.
  3. Rename, delete with items, and show / hide.
  4. Copy to Trip.
