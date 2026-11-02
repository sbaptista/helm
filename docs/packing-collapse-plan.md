# Packing — Show / hide category and sub-group contents (plan)

**Status:** approved by Stan 2026-11-01; built in 00.04.0019.
**Target version:** `00.04.0019`

## Change

- **Toggle on each heading:** every category heading and every sub-group heading gets a ▾ / ▸ button at its left (44pt). Tapping the name does the same.
  - ▾ = shown, ▸ = hidden.
  - The button is announced to screen readers as "Hide Clothing" / "Show Clothing" (`aria-expanded`).
- **Hidden category:** only its heading stays. The heading keeps its "3/10 packed · 5 owned" progress and the Manage Sub-groups button. The Owned / Packed column labels, its items and its sub-groups are hidden.
- **Hidden sub-group:** only its heading stays, with a count added, e.g. "TOILETRIES · 4 items". Its items are hidden.
- **Show All / Hide All:** one button that switches between the two.
  - On Mac and iPad, it sits in the toolbar next to Reset Packed.
  - On iPhone, it's in the More ⋯ menu, to keep the single row of buttons.
- **Default:** everything is shown, as today.

## Behaviour with other features

- **Select:** the select box on a heading still works when the category or sub-group is hidden. It selects everything inside, and the "N selected" count includes those items. Move, Copy, Owned, Packed and Delete then act on them as usual.
- **Add Item / Edit:** after saving an item into a hidden category or sub-group, that place is shown, so the item is visible.
- **Stan / Cathy:** each person's tab keeps its own shown/hidden headings, because categories belong to one person.

## Remembering the choice

- What's hidden is remembered **on each device** (`localStorage`, one key per trip, holding the hidden category and sub-group ids), so it survives reloads and offline use.
- It's a viewing preference, so it isn't synced between devices. Hiding something on the iPhone doesn't hide it on the iPad.
- Following the AGENTS.md rule, the saved choice is read in `useEffect`, not in the `useState` initializer, so the page renders the same on the server and in the browser.
- Reads and writes are wrapped in try/catch. If storage is unavailable, everything is simply shown.
- Ids of deleted categories or sub-groups are dropped from the saved list when it's read.

## Database impact

None. No tables, queries or writes: the choice lives only in the browser.

## Also included

- **Version:** bump to `00.04.0019`.
- **Changelog:** a new entry in `lib/changelog.ts`.
- **Commit:** v00.04.0018 (category delete) is still uncommitted. Unless Stan wants it committed first, 0018 and 0019 are committed together after testing.
