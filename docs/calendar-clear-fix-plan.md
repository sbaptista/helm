# Google Calendar clear and rebuild plan

## Status

Approved by Stan on 2026-08-26. Implemented and live-verified.

## Research summary

- Helm creates dedicated secondary Google calendars for trips.
- The current route calls Google `calendars.clear`, which Google supports only for primary calendars.
- The Calendar modal ignores non-success responses, closes, and hides the failure.
- `resetTripCalendarSyncState` already defines the required rebuild behavior across Flights, Hotels, Transportation, Restaurants, Itinerary, and Checklist.

## Implementation

1. Detect whether the linked Google calendar is primary or secondary.
2. Retain `calendars.clear` for a primary calendar.
3. For a secondary calendar, list every active event with pagination and delete each event while preserving the calendar itself.
4. Only after Google clearing succeeds, clear all stored event IDs, preserve each `gcal_include` value, mark every included active record dirty, and leave excluded records clean.
5. Keep the Calendar modal open on failure, display the server error, and prevent duplicate clear requests.
6. Confirm the resulting Calendar state is Update Required and Update All can rebuild every included record.
7. Bump Helm to `00.03.0002` and update release documentation.

## Verification

- Run TypeScript, focused lint, production build, and `git diff --check`.
- Verify the confirmation UI without performing a deletion.
- Stan performed the live clear successfully after action-time confirmation.
- Post-clear database verification found one included Itinerary row still checked and dirty with a null event ID. All excluded active records remained clean, and all stored event-ID fields were null.
- The resulting dirty count is one, which satisfies the status route's `update_required` condition and queues that record for Update All.

## Database and external-service impact

- No new table, column, index, RLS policy, Realtime subscription, DB query pattern, or recurring write path.
- A clear operation adds one paginated Google Events list plus one Google Events delete request per event on a secondary calendar.
- Existing bounded database reset writes run once per supported Calendar section after the Google operation succeeds.
