# HELM-71 — Reference Card Header Font Size Plan

## Status

Approved by Stan and implemented on 2026-08-29 in v00.03.0007. Todo: HELM-71.

## Research Summary

- The shared 3×5 `CardWrapper` renders front and rear cards with identical dimensions and padding.
- Browser measurement confirmed identical content and divider positions for a one-row Daily card.
- The shared `CardHeader` title used `14.7px`, while its date/subtitle used `13.3px`.
- Every 3×5 category uses this shared header component.

## Change

1. Set the shared header title font size to `13.3px`, matching the date/subtitle.
2. Leave all card dimensions, padding, capture geometry, footer, watermark, and content styles unchanged.
3. Apply the adjustment through the shared component so Flights, Hotels, Transportation, Restaurants, Key Info, and Daily Itinerary cards remain consistent.

## Verification

- Confirm the title and date/subtitle compute to the same font size.
- Regenerate a Daily Itinerary PDF and compare front/rear header placement and bottom clearance.
- Confirm representative non-Itinerary cards retain their established layout.
- Run TypeScript and `git diff --check`.

## Platform Notes

- PDF geometry is fixed at 5×3 inches and independent of Mac, iPad, and iPhone viewport breakpoints.
- Physical Epson output remains the final check for feed alignment and edge clearance.

## Database Impact

None. No query, schema, index, RLS, Realtime, or write-path change.
