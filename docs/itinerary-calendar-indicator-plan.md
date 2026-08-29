# Itinerary calendar indicator

## Goal

Make Calendar inclusion visible at a glance on each Itinerary row without opening
its edit sheet.

## Approved behavior

- Show a gold Calendar Check icon when the row's `gcal_include` flag is true.
- Hide the icon whenever `gcal_include` is false, including immediately after an
  unchecked row is saved.
- Place the icon with the row's trailing metadata beside the category badge.
- Give the icon the accessible label and tooltip `Included in Google Calendar`.
- Reflect inclusion intent, not remote sync completion; Update All remains the
  mechanism that creates or deletes the Google event.

## Platform behavior

The indicator is non-interactive and remains within the existing wrapping row
layout, so it does not create a small touch target or crowd narrow iPhone rows.

## Database impact

None. The UI reads the existing `gcal_include` value and adds no query, write,
table, column, index, RLS policy, or Realtime subscription.

## Approval

Approved by Stan on 2026-08-26, with explicit confirmation that unchecking the
flag must remove the icon.

## Verification

- Confirmed the existing save flow refetches rows, so both checking and
  unchecking update the conditional icon after save.
- `npx tsc --noEmit` passed.
- Focused ESLint passed for `ItineraryClient.tsx`.
- `npm run build` passed on Next.js 16.2.5.
- `git diff --check` passed.
