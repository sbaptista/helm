# HELM-70 — Google Calendar Integrity Repair

**Status:** Approved for implementation by Stan on 2026-07-21.

## Confirmed failures

- Helm treats a non-null `trips.gcal_calendar_id` as proof that the Google calendar still exists.
- Deleting the calendar in Google leaves stale calendar metadata and event IDs in Helm.
- `Update All` catches per-event Google failures, displays them as successes, writes `gcal_last_synced_at`, and emits a successful completion.
- The status endpoint counts every dirty record, while the push path processes only records that are both included and dirty.
- Hotel and checklist rows clear `gcal_dirty` even when one or more Google operations fail.
- Calendar eligibility must not expand beyond records that are both included and dirty.

## Approved repair

1. Validate the stored calendar with Google when the Calendar modal opens and immediately before syncing.
2. Present a missing-calendar state that lets the user select an existing writable Google calendar or create a new one.
3. When relinking, clear obsolete event IDs and mark every included calendar record dirty for a complete rebuild.
4. Make status and sync use the same eligibility rule: `gcal_include = true` and `gcal_dirty = true`. No other record mutations enter the Update All queue.
5. Preserve dirty state after any failed Google operation and update `gcal_last_synced_at` only after an entirely successful sync.
6. Carry event success/error state through SSE and render truthful progress and completion messages.
7. Calendar sync is required only when both `gcal_include = true` and `gcal_dirty = true`. Disabling Calendar inclusion clears sync eligibility; it does not broaden the Update All queue.
8. Add structured error logging and verify all six calendar-enabled sections.
9. Clear Calendar removes Google events and obsolete event IDs, then marks every included record dirty so the next Update All performs a complete rebuild.

## Database impact

- No migration, table, column, Realtime subscription, or index is required.
- Existing trip calendar metadata, event-ID fields, dirty flags, and last-sync timestamp are updated only through explicit calendar workflows.
- Relinking performs bounded updates across the six existing trip-section tables.

## Flight timezone correction

- Flight details display departure and arrival in their respective airport-local timezones.
- Flight saves and imports convert each airport-local clock value plus IANA timezone into a real UTC instant.
- Google Calendar receives those fixed instants and renders them in the calendar viewer's active timezone.
- The four existing Canadian Rockies flight instants were corrected in place and marked dirty for resync; no schema change was required.

## Verification

- TypeScript and focused lint.
- Production build.
- Missing-calendar recovery against the deleted Canadian Rockies calendar.
- Existing-calendar selection and new-calendar creation.
- Successful and failed event updates across flights, hotels, transportation, restaurants, itinerary, and checklist.
- Red-dot state after success and after partial failure.
