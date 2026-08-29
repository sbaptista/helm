# Calendar item deletion repair

## Problem

Helm soft-deletes section records by setting `deleted_at`, but Calendar status and
Update All only read active records. A deleted record that still owns a Google
event ID therefore becomes unreachable and leaves an orphan event in Google
Calendar.

## Approved behavior

- Deleting a calendar-linked record hides it in Helm and queues its remote event
  for deletion.
- Calendar status reports **Update Required** while a deleted record still owns a
  Google event ID.
- Update All reads dirty tombstones, deletes their remote events, clears their
  stored event IDs, and marks them clean.
- Deleted records can never create or update Google events, even if stale data
  still says `gcal_include = true`.
- Clear Calendar clears event IDs and dirty state from active and deleted records
  before queuing only included active records for rebuilding.
- Deleting an itinerary day applies the same tombstone state to its child rows.
- Existing orphaned records, beginning with `Arrive SEA`, are repaired by setting
  them to the pending-deletion state.

## Scope

Flights, hotels, transportation, restaurants, itinerary rows, checklist items,
Calendar status, Update All progress accounting, and itinerary-day deletion.

## Database impact

- No new table, column, RLS policy, Realtime subscription, or high-frequency write.
- Update All and status retain their existing trip-scoped `gcal_dirty` query and
  stop excluding soft-deleted tombstones. Trip records are small and the access
  pattern is unchanged, so no new index is warranted.

## Verification

- `npx tsc --noEmit` passed.
- Focused ESLint passed for every changed deletion and Calendar-sync route.
- `npm run build` passed on Next.js 16.2.5.
- `git diff --check` passed.
- The deleted `Arrive SEA` row is confirmed excluded and dirty while retaining its
  Google event ID for the next Update All deletion.
