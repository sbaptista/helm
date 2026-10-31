# Packing Multi-Select — Plan

**Status:** proposed and approved by Stan 2026-10-31 (with category and sub-group select); built as v00.04.0012 — Claude Code (Opus 5.5). Not yet tested.

## Request

Stan: multi-selection in Packing — select/deselect all, individual selections,
set Owned on/off, set Packed on/off, delete selected.

## Current state

- `components/sections/PackingClient.tsx`: tapping an item row opens its edit
  sheet; the Owned and Packed checkboxes on the row toggle one item each
  (optimistic, `apiFetch` PATCH `/api/packing/[id]`, reverted on failure).
  Delete is only in the edit sheet (soft delete, `deleted_at`).
- All saves go through `apiFetch`, so they work offline: queued in the
  outbox, synced in order, field-level merge (`docs/offline-editing-plan.md`).
- The list shows one person at a time (Stan / Cathy tabs).

## Proposed behaviour

1. **Select** button in the Packing toolbar enters selection mode (**Done**
   leaves it and clears the selection). Normal mode is unchanged.
2. In selection mode:
   - Each item row gets a leading checkbox (44pt hit target). Tapping anywhere
     on the row selects/deselects it instead of opening the edit sheet.
   - The row's Owned/Packed checkboxes are hidden, so a tap can't change an
     item by accident; the row still shows its state (✓ Owned, ✓ Packed text).
   - Selection covers the open tab's person only; switching tabs clears it.
3. An action bar, sticky below the trip top bar (`top: 104px`; not a fixed
   footer — known iOS failure mode), shows:
   - **Select All** / **Deselect All** (one toggle button) and "12 selected".
   - **Owned ✓**, **Owned ✗**, **Packed ✓**, **Packed ✗**.
   - **Delete…** — asks "Delete 12 items?" with Cancel / Delete in the bar.
   - Actions are disabled with nothing selected. Buttons wrap on iPhone.
4. After an action, the selection stays (so you can, say, mark Owned and then
   Packed). After Delete, the deleted items leave the selection.
5. Toast: "12 items marked packed". If some fail: "3 of 12 couldn't be saved",
   and those items go back to how they were.

## Implementation

- **Client only**, in `PackingClient.tsx`: `selectMode`, `selectedIds: Set<string>`,
  a `bulkUpdate(fields)` and `bulkDelete()` helper, the action bar, and the row
  changes in `renderItem`.
- Each selected item is sent as its own `apiFetch` PATCH / DELETE to the
  existing routes, 4 at a time. That keeps offline editing, the outbox, and
  conflict merging working with no changes, and needs **no new route or
  migration**. Items already in the requested state are not sent.
- **Category select** (added at Stan's request 2026-10-31): in selection mode,
  each category header gets a checkbox (44pt hit target) that selects or
  deselects every item in that category, sub-groups included. It shows
  checked when all are selected, a dash (indeterminate) when some are, and is
  hidden for a category with no items. Sub-group headers get the same
  checkbox for the items in that sub-group (added at Stan's request
  2026-10-31). Category and sub-group checkboxes stay in step: selecting a
  whole category ticks its sub-groups, and selecting every sub-group plus the
  category's loose items ticks the category.
- Version bump + `lib/changelog.ts` entry.

**Alternative (not recommended):** one bulk route
(`PATCH /api/trips/[id]/packing-bulk`). It is faster for very large
selections but online-only, unless the offline outbox were taught a new
kind of change, which is a large change to `lib/offline/` for little gain at
Helm's list sizes.

## Database impact

| Question | Answer |
|---|---|
| New query pattern? | No. Same per-item PATCH/DELETE as tapping a checkbox (look up item, check membership, update by `id`). |
| Realtime? | No. |
| Frequent writes? | One user action writes up to the number of selected items (typically 10–100 row updates), the same as tapping each checkbox. Each update leaves one dead tuple; items already in the requested state are skipped. Normal autovacuum handles this; no change in pattern. |
| New table / column / index / RLS? | None. |

## Verification

Typecheck and lint, then Stan on localhost (Mac, iPad and iPhone via Bonjour):
select some / all, each of the five actions, delete confirmation, switching
tabs clears selection, and the same actions offline (pill counts the queued
changes and they sync on reconnect).

---

## Revision 1 — speed and progress dialog (approved by Stan 2026-10-31 with the dialog also on Reset Packed and Copy to Trip; built as v00.04.0013, not yet tested)

**Stan's test (Mac, iPad, iPhone):** bulk updates are sometimes very slow and sometimes acceptably fast. He asked for an in-progress dialog that blocks the page until an update finishes.

**Why it is slow, and why only sometimes:**
1. **One request per item.** Each `PATCH /api/packing/[id]` makes four round trips to Supabase in sequence: check the sign-in, look up the item's trip, check membership, then update. With 4 requests at a time, 60 items means 15 rounds of about 4 round trips each. How long that takes depends on network latency, which varies from one moment to the next.
2. **The slow path through the outbox.** If any earlier change is still waiting (a brief network drop, or a single failed save), `apiFetch` queues every later change, and the outbox sends them **one at a time**. That turns a 4-at-a-time run into one-by-one and is the most likely cause of the "very slow" runs.
3. Each saved item also rewrites the device copy of the whole packing list in `localStorage`. That's minor, but it adds up on iPhone.

**Proposed fix:**
- New route `POST /api/trips/[id]/packing-bulk` with body `{ action: 'update', ids, fields: { owned? | packed? } }` or `{ action: 'delete', ids }`. It checks the sign-in and membership once, runs one `UPDATE … WHERE trip_id = :trip AND id = ANY(:ids)` (soft delete sets `deleted_at`), and returns the changed rows. The whole selection takes one request, about 1 s however many items are selected.
- A new `apiBulk()` in `lib/offline/api-fetch.ts`. **Online with nothing waiting**, it calls the bulk route and updates the device copy once. **Offline, or with earlier changes waiting**, it falls back to the current per-item path so offline editing and ordering still work (it's slower, but only in that case).
- **In-progress dialog:** a full-screen overlay above everything (z-index above the header and update banner, below toasts). It shows "Updating 12 items…" or "Deleting 12 items…", plus "8 of 12" on the per-item path. It blocks every tap and scroll until the update finishes, then closes and the result toast appears. It's announced to screen readers (`role="alertdialog"`, `aria-busy`).
- The same dialog covers **Reset Packed** and **Copy to Trip** (Stan's choice).

**As built:** route `app/api/trips/[id]/packing-bulk/route.ts` (any trip member, like the per-item routes; fields limited to `owned`/`packed`; at most 1000 ids). `apiBulk()` also falls back to the per-item path if the bulk request fails. Overlay: `components/ui/BusyOverlay.tsx` (z-index 900, `.busy-spinner` in `app/globals.css`).

**Database impact:** less load than now. There's one membership check and one `UPDATE` per action instead of 3–4 queries per item. The update finds rows by primary key and `trip_id`, so no new index is needed. Rows changed, dead tuples and `updated_at` trigger runs are the same as now. No new table, column, policy or Realtime.

---

## Revision 2 — Packing controls stay at the top (approved by Stan 2026-10-31; built as v00.04.0014, not yet tested)

**Stan (after testing 0013, "Looks good"):** keep the menu controls at the top so the items scroll beneath them. That makes adding and deleting entries easier.

**Proposed:**
- One sticky block under the trip top bar (`top: 104px`, the same position the selection bar already uses and that Stan tested on all three devices; z-index 20; solid `var(--bg)` background; a thin bottom border). It holds the toolbar buttons, the Stan / Cathy tabs, and, in selection mode, the selection bar, which moves into this block. The "Packing List" title scrolls away to save height.
- **iPhone (narrow screens):** the five buttons wrap to two or three rows today. Together with the tabs and the selection bar, that would pin about a third to a half of the screen. So below 768px wide, **Reset Packed**, **Manage Categories** and **Copy to Trip…** move into a **More ⋯** menu (44pt items, tap to open, tap outside to close). That leaves one row: **Select**, **More ⋯**, **+ Add Item**. Mac and iPad keep all buttons visible.
- No change to what any button does. Only `PackingClient.tsx` and a little CSS change. No database impact.

**As built:** `.pack-controls` and the More menu styles in `app/globals.css`. Both toolbars are rendered and CSS (`max-width: 767px`) picks one, so there is no hydration mismatch.

---

## Revision 3 — pinned controls on iPhone (approved by Stan 2026-10-31; built as v00.04.0015, not yet tested)

**Stan:** the controls are not pinned on iPhone (Mac and iPad are fine, after the dev cache was cleared).

**Cause:** `.pack-controls` pins at a fixed `top: 104px` (DashboardBar 40 + TripTopBar 64). On iPhone the trip name in `TripTopBar` wraps (it has `minHeight: 64px` but no height limit), so the bar is taller than 64px. The controls stick underneath it, and the top bar (z-index 30) covers them (z-index 20), so the list looks unpinned.

**Fix:** `TripTopBar` measures itself (`ResizeObserver`) and sets a CSS variable `--trip-bar-bottom` on the page (its sticky `top` plus its height). `.pack-controls` uses `top: var(--trip-bar-bottom, 104px)`. The value follows rotation, title changes and the update banner. Nothing else changes.
