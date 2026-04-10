# 3×5 Card Print Margin History
## CAN26 → Helm Porting Reference

---

## The Core Problem

The original CSS used `@page { margin: 0 }` — intentional for edge-to-edge bleed. The Epson printer's hardware minimum margin (~0.12in) clipped content on all four sides, most visibly the mountain silhouette at bottom/left/right. The top was less noticeable because the nearest content (the FRONT/BACK label) was already ~0.20in from the edge, so the hardware margin clipped into empty space there.

---

## What Was Tried and Why It Failed

### v0.10.101 — `@page` margin added
Added a small physical clearance to the page rule:

```css
@page { size: 5in 3in landscape; margin: 0.08in; }
```

**Result: catastrophic failure.** The `.card-page` element was still declared `width: 5in; height: 3in`. With `margin: 0.08in`, the printable area shrank to `4.84in × 2.84in` — the card overflowed and the browser rendered almost nothing. Output was a single solid gray line at the top of the page.

**Lesson:** You cannot add `@page` margin when the card element is sized to exactly fill the page. The two fight each other.

---

## The Actual Fix: Internal Padding, Not Page Margin

Keep `@page { margin: 0 }` always. Push content away from the edges using the card element's internal **padding**. The full 5×3in page is used; padding just creates breathing room inside it.

### v0.10.102 — First padding increase
```css
@page { size: 5in 3in landscape; margin: 0; }

.card-page {
  width: 5in; height: 3in;
  padding: 0.22in 0.28in 0.18in 0.28in; /* was 0.17in 0.22in 0.14in 0.22in */
}
```
Still not enough — text clipped on right, top, and bottom.

### v0.10.103 — Padding roughly doubled
```css
.card-page {
  padding: 0.35in 0.38in 0.30in 0.38in;
}
```
Better, but right side and bottom still clipping.

### v0.10.104 — Right and bottom padding increased; footer offsets updated
Right and bottom padding pushed further. Critically, the **absolutely-positioned `.card-footer` and `.side-label`** also had their `right` offsets updated to match — they were still at `0.22in` and would clip independently of the card padding.

```css
.card-page {
  padding: 0.35in 0.50in 0.42in 0.38in;
  /* top   right  bottom left */
}

.card-footer {
  position: absolute;
  bottom: 0.14in;
  right: 0.50in;
  font-size: 6pt;
}

.side-label {
  position: absolute;
  top: 0.12in;
  right: 0.50in;
  font-size: 6pt;
}
```

---

## Print Settings (Preview / macOS)

Two separate issues surfaced during testing that are not fixable in code:

### Scale setting
The "3x5 BW Rear Tray" preset had **Scale to Fit** saved at ~78%, which shrinks the rendered card away from the card edges. Must be set to **Scale: 100%** and re-saved into the preset.

### Landscape orientation
`@page { size: 5in 3in landscape }` is respected by the browser's own print dialog but **macOS overrides orientation** when you escalate to the system dialog. This is a known browser/macOS limitation — nothing fixable in CSS. Workaround: set landscape manually in the system dialog once, then save it into the "3x5 BW Rear Tray" preset so it's remembered.

---

## Summary for Helm Implementation

| What | Value |
|------|-------|
| `@page` margin | Always `0` |
| Card padding (top) | `0.35in` |
| Card padding (right) | `0.50in` |
| Card padding (bottom) | `0.42in` |
| Card padding (left) | `0.38in` |
| Absolutely-positioned footer `right` | `0.50in` |
| Absolutely-positioned footer `bottom` | `0.14in` |
| Absolutely-positioned label `right` | `0.50in` |
| Preview scale | `100%` (not Scale to Fit) |
| Landscape | Set in system dialog, saved to preset |

> **Key principle:** Never try to solve printer hardware margins with `@page` margin. The card element sized to fill the page and a non-zero `@page` margin will always fight each other. Use padding inside the card instead.
