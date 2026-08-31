# Hotel Contact and Location Details in Print Plan

## Status

Approved by Stan and implemented on 2026-08-30 in v00.03.0008–00.03.0010.

## Research Summary

- `HotelRow.phone` already exists and is loaded by the authenticated print route.
- The 3×5 Hotel front currently shows name, address, and check-in date.
- The 8.5×11 Accommodations section currently shows check-in, address, check-out, and confirmation.

## Change

1. Show the phone inline beside Check-in on the 3×5 Hotel front, separated by a bullet and preserving the existing three-line entry height.
2. Show the phone beneath Address in the 8.5×11 Accommodations section.
3. Show the city beside the street address in both print formats, separated by a comma when both values exist.
4. Render an em dash when a Hotel has no stored phone number or address/city value.
5. Leave Hotel card counts, back-side confirmations, print dimensions, and PDF capture unchanged.

## Verification

- Generate the Hotel 3×5 PDF and confirm phone numbers fit without clipping.
- Confirm the Hotel city appears beside the street address in both print formats.
- Generate the 8.5×11 Hotels section and confirm phone numbers and cities appear with their Hotel.
- Run TypeScript and `git diff --check`.

## Platform Notes

- The fixed PDF layouts are viewport-independent; verify the downloaded PDF and physical Epson output.

## Database Impact

None. This uses an existing selected field and adds no query, schema, index, RLS, Realtime, or write-path change.
