# Itinerary timezone display plan

## Status

Approved by Stan on 2026-08-26. Implemented and verified.

## Research summary

- `itinerary_rows` already stores `start_timezone` and `end_timezone` separately.
- The Itinerary form omits Seattle from its location-specific timezone choices.
- The Itinerary entry display converts both instants correctly but appends only the start timezone abbreviation after the complete range.
- Daily Itinerary 3×5 cards currently discard the end time and end timezone before rendering.

## Implementation

1. Add Seattle (`America/Los_Angeles`) to the Itinerary start/end timezone selectors.
2. Add one shared formatter for compact itinerary time ranges.
3. Show both abbreviations when the start and end zones differ; retain one trailing abbreviation when they are the same.
4. Include end time and end timezone on Daily Itinerary 3×5 cards.
5. Leave every other 3×5 card category unchanged.
6. Bump Helm to `00.03.0001` and update release documentation.

## Platform and verification

- Verify the Itinerary entry display at Mac, iPad, and iPhone widths.
- Verify a Daily Itinerary 3×5 preview with a cross-timezone row.
- TypeScript, focused lint, and the production build passed.
- The live HNL→SEA entry rendered as `11:30 PM HST – 8:13 AM PDT` on both the Itinerary page and its Daily 3×5 card.
- Seattle appeared in both timezone selectors, Daily 3×5 PDF generation completed, and browser logs contained no warnings or errors.

## Database impact

None. This adds no query pattern, table, column, index, RLS policy, Realtime subscription, or write path.
