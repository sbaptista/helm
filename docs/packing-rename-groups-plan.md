# Rename Packing Categories and Sub-groups — Plan

**Status:** proposed and approved by Stan 2026-10-31; built as v00.04.0015 — Claude Code (Opus 5.5). Not yet tested.

## Request

Stan: allow Categories and Sub-categories (sub-groups) to be renamed.

## Current state

- **Manage Categories** and **Manage Sub-groups** sheets in `components/sections/PackingClient.tsx` list each name with ↑ ↓ × buttons and a "New …" field. There is no rename.
- `PATCH /api/packing-groups/[id]` and `PATCH /api/packing-subgroups/[id]` already accept any field, including `name`. Saves go through `apiFetch`, so they work offline.

## Proposed behaviour

- Each row in both sheets gets a **✎ Rename** button (44pt), next to ↑ ↓ ×.
- Tapping it turns the name into a text field filled with the current name, with **Save** and **Cancel**. Enter saves, Escape cancels. Only one row is edited at a time.
- **Validation** (on blur and on Save, per Helm's touched-field rule):
  - the name is required (trimmed);
  - it can't match another category of the same person, or another sub-group in the same category (case-insensitive). Duplicates would otherwise merge unexpectedly in Copy to Trip.
  - Errors show under the field, with a red border only after the field has been touched.
- The new name shows at once in the sheet and in the list headings (optimistic). If the save fails, the old name comes back with an error toast.

## Implementation

- Client only, in `PackingClient.tsx`: rename state, a `renameGroup()` / `renameSubgroup()` pair (`apiFetch` PATCH `{ name }`), and the row's edit mode in both sheets.
- No new route and no migration. Version bump and changelog entry.

## Database impact

None new: one `UPDATE` of one row per rename, the same pattern as reordering. No new query, index, table, column, policy or Realtime.
