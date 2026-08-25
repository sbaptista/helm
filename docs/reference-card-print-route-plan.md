# Reference Card Print Route

**Status:** Approved by Stan on 2026-08-23.

## Research summary

- The working 8.5×11 packet uses the server-rendered `/advisor/trips/[id]/print` route.
- Reference cards separately query Supabase from `PrintExportModal`, render an off-screen DOM tree, and capture it with `html2canvas`/`jsPDF`.
- The card button can run before data is available, failed browser queries are converted to empty arrays, and the dashboard supplies no itinerary days.
- Next.js 16 requires both page `params` and `searchParams` to be awaited. The existing print page already follows that contract.

## Approved implementation

1. Add packet/card modes to the existing print route.
2. Keep all print data loading on the server through the existing authenticated data path.
3. Move reference-card rendering out of the modal and into a print-route component.
4. Support flights, hotels, transportation, restaurants, Key Info, and daily itinerary cards.
5. Filter itinerary rows by their actual day before paginating each daily card.
6. Preserve Helm's validated `html2canvas` → `jsPDF` engine and its Epson-tested card margins while moving it onto the dedicated route.
7. Add a route-level progress screen that says what is being prepared while server data loads.
8. Show a clear empty state rather than attempting to print when a selected card has no content.
9. Expose the same print modal from both the dashboard card menu and the travel-data sidebar, without duplicating print data loading in either caller.

## Database impact

- Uses the print route's existing bounded trip-section queries.
- No new table, column, migration, index, write pattern, or Realtime subscription.
- No frequent writes; printing remains read-only.

## Platform and verification

- Mac: verify packet printing and each exact-size 3×5 PDF category.
- iPad/iPhone: retain the existing unsupported-print notice and disabled action.
- Run TypeScript, focused ESLint, and the production build.
- Confirm the loading screen is legible, announces status accessibly, and appears before the print content is ready.
