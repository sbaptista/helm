# Expansion of 3x5 Reference Card System

Add dedicated 3x5 reference cards for **Transportation** and **Restaurants** to the Helm printing system.

## User Review Required

> [!IMPORTANT]
> - This plan adds two new card types to the 3x5 card selection UI.
> - Data for these cards will be fetched on the server in `app/advisor/trips/[id]/page.tsx` to ensure RLS-bypass reliability, matching the pattern established for Flights and Hotels.

## Proposed Changes

### [Server] Data Fetching

#### [MODIFY] [page.tsx](file:///Users/stanleybaptista/Projects/helm/app/advisor/trips/[id]/page.tsx)
- Update the `sectionChecks` `Promise.all` call to fetch full records for:
  - `transportation` (ordered by `departure_time`)
  - `restaurants` (ordered by `reservation_time`)
- Extract this data and pass it to `TripDetailView` as `transportationData` and `restaurantsData`.

---

### [UI] Component Updates

#### [MODIFY] [TripDetailView.tsx](file:///Users/stanleybaptista/Projects/helm/components/advisor/TripDetailView.tsx)
- Update `TripDetailViewProps` to include `transportationData` and `restaurantsData`.
- Pass these data arrays to the `PrintExportModal` component.

#### [MODIFY] [PrintExportModal.tsx](file:///Users/stanleybaptista/Projects/helm/components/advisor/PrintExportModal.tsx)
- Update `PrintExportModalProps` to receive `initialTransportation` and `initialRestaurants`.
- Update the selection UI (Reference Cards tab) to include "transportation" and "restaurants" buttons.
- Add rendering logic for the new card types in the hidden `captureLayerRef` area:
  - **Transportation Card**: Title, Sub-title, rows for Provider/Type, Route (Origin → Destination), Time, and Confirmation Number.
  - **Restaurant Card**: Title, Sub-title, rows for Name, Address, Time, and Confirmation Number.
- Implement `chunkArray` pagination for both new cards (e.g., 4 items per card).

---

### [MetaData] Versioning

#### [MODIFY] [version.ts](file:///Users/stanleybaptista/Projects/helm/lib/version.ts)
- Bump `VERSION` to `00.01.0057`.

## Open Questions

- None at this time. The layout will follow the existing `CardTemplates` pattern.

## Verification Plan

### Manual Verification (AI2)
- Open a trip with transportation and restaurant records.
- Launch the **Print / Export Trip** modal.
- Switch to **Reference Cards (3x5)** tab.
- Click **🚍 transportation** and **🍽️ restaurants** buttons.
- Click **Save Card PDF** and verify the generated PDF has correct data, formatting, and mountain watermark.
- Verify that if there are >4 items, it generates multiple "Card X of Y" pages.
