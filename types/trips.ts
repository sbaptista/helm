// Lifecycle order: Draft → Upcoming → Active → Done. Done keeps all trip data;
// Delete removes a trip for good.
// Archive was removed 2026-11-06 (Stan): it deleted a trip's data but kept an
// empty trip, which made it Delete under another name. 'archived' stays in the
// type for trips archived before then; they have no data and can only be deleted.
export const TRIP_STATUSES = ['draft', 'upcoming', 'active', 'done'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number] | 'archived';

export interface Trip {
  id: string;
  title: string;
  destination: string;
  // Derived from the itinerary's first and last day (lib/trip-range.ts).
  start_date: string | null;
  end_date: string | null;
  status: TripStatus;
  created_at: string;
  traveler_count: number;
  // Hotel and Restaurant cards show map pictures (docs/map-pictures-choice-plan.md).
  show_map_pictures: boolean;
}
