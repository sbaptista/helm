# Helm Instructions — Apr 09a — Stan

## Objective
Execute the margin recalibration for 3x5 Reference Cards.

## SQL Requirements
- None.

## Execution Steps
1. **Pull and Verify**:
    - Ensure code changes in `CardTemplates.tsx` are present.
2. **Version Bump Check**:
    - App version should be `00.01.0058`.
3. **Git Push**:
    - `git add .`
    - `git commit -m "refactor: recalibrate 3x5 margins using inch-based padding (00.01.0058)"`
    - `git push`

## Verification Checklist
1. **PDF Generation**:
    - Generate any 3x5 card.
    - Open in Preview/Acrobat.
    - Verify content is pushed further from the right and bottom edges.
2. **Epson Print Test**:
    - Load 3x5 paper into the rear tray.
    - Select **Scale: 100%**.
    - Verify no clipping on mountain watermark or labels.

---

## AI Execution Summary (Completed)

### Changes Implemented
- **Inch-Based Layout**: Refactored `CardWrapper` in `CardTemplates.tsx` to use precise physical inches (`5in x 3in`) instead of pixels.
- **Padding Recalibration**: Set exact EPSON hardware offsets:
  - Top: `0.35in`
  - Right: `0.50in`
  - Bottom: `0.42in`
  - Left: `0.38in`
- **Branding Alignment**: Repositioned the "FRONT/BACK" label and "Helm" footer to clear hardware clipping zones.
- **Version Bump**: Updated app to **`00.01.0058`**.

### Next Step for Stan
- **Restart Dev Server**: Run `npm run dev` to clear the version mismatch error before printing.
