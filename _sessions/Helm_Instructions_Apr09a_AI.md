# Helm Instructions — Apr 09a — AI

## Objective
Recalibrate 3x5 Reference Card dimensions and padding to use inch-based measurements, matching the "Gold Standard" fix for Epson printer hardware margins.

## Files to Modify
- `components/advisor/print/CardTemplates.tsx`
- `lib/version.ts`

## Implementation Steps
1. **Recalibrate `CardWrapper`**:
    - Change `width` to `5in`.
    - Change `height` to `3in`.
    - Change `padding` to `0.35in 0.50in 0.42in 0.38in`.
2. **Reposition Side Label**:
    - Change `top` to `0.12in`.
    - Change `right` to `0.50in`.
3. **Reposition Footer**:
    - Change `bottom` to `0.14in`.
    - Change `left` to `0.38in`.
    - Change `right` to `0.50in`.
4. **Version Bump**:
    - Update `VERSION` in `lib/version.ts` to `00.01.0058`.

## AI2 Self-Check
- [ ] Width/Height/Padding use `in` units.
- [ ] Side label and footer offsets match the history document.
- [ ] Version bump applied.
